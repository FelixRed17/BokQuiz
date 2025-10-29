# app/controllers/api/v1/games_controller.rb
module Api
  module V1
    class GamesController < ApplicationController
      before_action :find_game, except: :create
      before_action :require_host!, only: [ :host_start, :host_next, :host_finish ]

      # POST /api/v1/games
      def create
        host_name = params.require(:host_name)
        game = ::Game.create!
        host = game.players.create!(name: host_name, is_host: true, ready: true)
        ok({ code: game.code, host_token: game.host_token, host_player_id: host.id }, status: :created)
      end

      # GET /api/v1/games/:code/state
      # Safe public state (no answers/scores mid-round)
      def state
        players = @game.players.order(:created_at).map { |p| { name: p.name, eliminated: p.eliminated, is_host: p.is_host, ready: (p.respond_to?(:ready) ? p.ready : false) } }
        time_remaining_ms = if @game.question_end_at
          [ (@game.question_end_at - Time.current) * 1000, 0 ].max.to_i
        else
          0
        end

        sd_participants = if @game.respond_to?(:sudden_death_player_ids) && @game.sudden_death? && @game.sudden_death_player_ids.present?
          ids = Array(@game.sudden_death_player_ids)
          @game.players.where(id: ids).order(:created_at).pluck(:id, :name).map { |id, name| { id: id, name: name } }
        else
          []
        end

        ok({
          status: @game.status,
          round_number: @game.round_number,
          current_question_index: @game.current_question_index,
          time_remaining_ms: time_remaining_ms,
          players: players,
          sudden_death_participants: sd_participants
        })
      end

      # POST /api/v1/games/:code/join
      def join
        name = params.require(:name).to_s.strip
        # Validation checks
        if @game.players.where(is_host: false).count >= 4
          return render json: { error: { code: "full", message: "Game is full" } }, status: 422
        end

        if @game.players.exists?(name: name)
          return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422
        end

        unless @game.lobby?
          return render json: { error: { code: "bad_state", message: "Join only in lobby" } }, status: 422
        end

        # Create the player (auto-ready by default for non-hosts)
        player = @game.players.create!(name: name, is_host: false, ready: true)

        # Broadcast player joined event
        broadcast(:player_joined, { name: player.name })

        # If all non-host players are present and ready, inform host UI (parity with previous /ready)
        non_hosts = @game.players.where(is_host: false)
        all_ready = non_hosts.exists? && non_hosts.where(ready: true).count == non_hosts.count
        broadcast(:all_ready, {}) if all_ready

        ok({ player_id: player.id, reconnect_token: player.reconnect_token })
      end

      # POST /api/v1/games/:code/rename
      def rename
        return render json: { error: { code: "bad_state", message: "Rename only in lobby" } }, status: 422 unless @game.lobby?
        player_id = params.require(:player_id).to_i
        token     = params.require(:reconnect_token)
        new_name  = params.require(:name).to_s.strip

        player = @game.players.find(player_id)
        return render json: { error: { code: "auth", message: "Bad token" } }, status: 403 unless player.reconnect_token == token
        return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422 if @game.players.where.not(id: player.id).exists?(name: new_name)

        old_name = player.name
        player.update!(name: new_name)
        broadcast(:player_renamed, { old_name: old_name, new_name: new_name })
        ok({ renamed: true })
      end

      # POST /api/v1/games/:code/ready
      def ready
        return render json: { error: { code: "bad_state", message: "Ready only in lobby" } }, status: 422 unless @game.lobby?
        player_id = params.require(:player_id).to_i
        token     = params.require(:reconnect_token)
        ready_val = ActiveModel::Type::Boolean.new.cast(params.require(:ready))

        player = @game.players.find(player_id)
        return render json: { error: { code: "auth", message: "Bad token" } }, status: 403 unless player.reconnect_token == token

        player.update!(ready: ready_val) if player.respond_to?(:ready)
        broadcast(:player_ready, { name: player.name, ready: ready_val })

        # If all non-host players are present and ready, inform host UI
        non_hosts = @game.players.where(is_host: false)
        all_ready = non_hosts.exists? && non_hosts.where(ready: true).count == non_hosts.count
        broadcast(:all_ready, {}) if all_ready

        ok({ ready: ready_val })
      end

      # POST /api/v1/games/:code/host_start
      def host_start
        return render json: { error: { code: "bad_state", message: "Not in lobby" } }, status: 422 unless @game.lobby?

        # Validate exactly 5 questions per round
        unless (1..3).all? { |r| Question.where(round_number: r).count == 5 }
          return render json: { error: { code: "bad_setup", message: "Each round must have exactly 5 questions" } }, status: 422
        end

        @game.update!(status: :in_round, round_number: 1, current_question_index: 0)
        start_current_question!
        ok({ started: true, round_number: @game.round_number, index: @game.current_question_index })
      end

      # POST /api/v1/games/:code/host_next
      def host_next
        unless @game.in_round? || @game.between_rounds? || @game.sudden_death?
          return render json: { error: { code: "bad_state", message: "Not in round or between rounds" } }, status: 422
        end

        # Sudden death flow
        return handle_sudden_death_next if @game.sudden_death?

        if @game.in_round?
          if @game.current_question_index >= 4
            # end of round
            @game.update!(status: :between_rounds, question_end_at: nil)
            broadcast(:round_ended, { round_number: @game.round_number })
            ok({ round_ended: true, round_number: @game.round_number })
          else
            @game.increment!(:current_question_index)
            start_current_question!
            ok({ advanced: true, index: @game.current_question_index })
          end
        else
          # between_rounds -> next round
          @game.update!(status: :in_round, current_question_index: 0, round_number: @game.round_number + 1)
          start_current_question!
          broadcast(:next_round_started, { round_number: @game.round_number })
          ok({ next_round_started: true, round_number: @game.round_number })
        end
      end

      # POST /api/v1/games/:code/submit
      def submit
        player_id = params.require(:player_id).to_i
        token     = params.require(:reconnect_token)
        choice    = params.require(:selected_index).to_i

        player = @game.players.find(player_id)
        return render json: { error: { code: "auth", message: "Bad token" } }, status: 403 unless player.reconnect_token == token
        return render json: { error: { code: "eliminated", message: "Player eliminated" } }, status: 422 if player.eliminated?
        return render json: { error: { code: "host", message: "Host cannot submit" } }, status: 422 if player.is_host?
        return render json: { error: { code: "closed", message: "Question closed" } }, status: 422 if @game.question_end_at.blank? || Time.current > @game.question_end_at

        # During sudden death, only participants may submit
        if @game.sudden_death?
          sd_ids = Array(@game.sudden_death_player_ids)
          unless sd_ids.include?(player.id)
            return render json: { error: { code: "not_participant", message: "Not in sudden death" } }, status: 422
          end
        end

        q = current_question
        opened_at    = @question_opened_at || (@game.question_end_at - q.time_limit.seconds)
        submitted_at = Time.current
        latency_ms   = ((submitted_at - opened_at) * 1000).to_i

        Submission.create_with(
          selected_index: choice,
          submitted_at: submitted_at,
          latency_ms: latency_ms,
          correct: (choice == q.correct_index)
        ).find_or_create_by!(game: @game, player:, question: q)

        ok({ accepted: true })
      end

      # GET /api/v1/games/:code/question
      def question
        return render json: { error: { code: "bad_state", message: "No open question" } }, status: 422 unless (@game.in_round? || @game.sudden_death?) && @game.question_end_at.present? && Time.current < @game.question_end_at
        q = current_question
        return render json: { error: { code: "not_found", message: "Question not found" } }, status: 404 unless q
        ok({
          round_number: (@game.sudden_death? ? 4 : @game.round_number),
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          ends_at: @game.question_end_at.iso8601(3)
        })
      end

      # GET /api/v1/games/:code/me
      def me
        player_id = params.require(:player_id).to_i
        token     = params.require(:reconnect_token)
        player    = @game.players.find(player_id)
        return render json: { error: { code: "auth", message: "Bad token" } }, status: 403 unless player.reconnect_token == token
        ok({ name: player.name, eliminated: player.eliminated, is_host: player.is_host, total_score: player.total_score })
      end

      # GET /api/v1/games/:code/round_result
      # Reveals end-of-round scores + who is eliminated; advances state accordingly.
      def round_result
        return render json: { error: { code: "bad_state", message: "Not between rounds" } }, status: 422 unless @game.between_rounds?

        round = @game.round_number
        rr = nil

        ActiveRecord::Base.transaction do
          @game.lock!

          # Idempotency: if already processed, return persisted result (no re-broadcast)
          if (existing = RoundResult.find_by(game_id: @game.id, round_number: round))
            payload = existing.payload.deep_symbolize_keys
            normalized_payload = {
              round: round,
              round_number: round,
              leaderboard: payload[:leaderboard] || [],
              eliminated_names: payload[:eliminated_names] || [],
              next_state: (payload[:next_state] || @game.status).to_s,
              sudden_death_players: payload[:sudden_death_players] || []
            }
            # Return from inside transaction (transaction will commit/rollback as usual)
            return ok(normalized_payload)
          end

          qs = questions_for_round(round)

          players = @game.players.where(is_host: false)
          active  = players.where(eliminated: false)

          # Compute round-only scores (points) and tie-break by total latency_ms
          round_stats = active.map do |p|
            rel = Submission.where(game: @game, player: p, question: qs)
            score = rel.where(correct: true).joins(:question).sum("questions.points")
            latency_sum = rel.where(correct: true).sum(:latency_ms)
            { player: p, name: p.name, round_score: score, latency_sum: latency_sum }
          end

          # Guard: if there are no active players, create an empty result and return
          if round_stats.empty?
            Rails.logger.warn("round_result: no active players for game=#{@game.id} round=#{round}")
            payload = {
              round: round,
              round_number: round,
              leaderboard: [],
              eliminated_names: [],
              next_state: @game.status.to_s,
              sudden_death_players: []
            }
            rr = RoundResult.create!(game: @game, round_number: round, payload: payload)
            return ok(payload)
          end

          # Determine lowest by score. If multiple players share the lowest score,
          # we trigger sudden death among them regardless of latency. Latency is
          # still used only for leaderboard ordering (not elimination at this stage).
          min_score = round_stats.map { |s| s[:round_score] }.min
          lowest = round_stats.select { |s| s[:round_score] == min_score }

          eliminated_names = []
          next_state = :between_rounds
          sd_player_names = []

          if lowest.size == 1
            loser = lowest.first[:player]
            unless loser.eliminated?
              loser.update!(eliminated: true)
            end
            eliminated_names = [ loser.name ]
          else
            # Multiple players tied at the lowest score → sudden death among them
            next_state = :sudden_death
            sd_ids = lowest.map { |s| s[:player].id }
            @game.update!(sudden_death_player_ids: sd_ids, current_question_index: 0, question_end_at: nil, sudden_death_attempts: 0, sudden_death_started_at: Time.current)

            # gather names for RoundResult payload so frontend can show participants
            sd_player_names = @game.players.where(id: sd_ids).order(:created_at).pluck(:name)
          end

          # If only one active non-host remains, finish game
          remaining = players.where(eliminated: false).count
          next_state = :finished if remaining <= 1

          # Broadcast game_finished AFTER determining final next_state
          if next_state == :finished
            winner = players.where(eliminated: false).first
            broadcast(:game_finished, { winner: winner&.name })
          end

          # persist canonical state update on game
          @game.update!(status: next_state, last_processed_round: round)

          # Build leaderboard
          leaderboard = round_stats.sort_by { |s| [ -s[:round_score], s[:latency_sum] ] }
                                   .map { |s| { name: s[:name], round_score: s[:round_score] } }

          payload = {
            round: round,
            round_number: round,
            leaderboard: leaderboard,
            eliminated_names: eliminated_names,
            next_state: next_state.to_s,
            sudden_death_players: sd_player_names
          }

          rr = RoundResult.create!(game: @game, round_number: round, payload: payload)

          # Return canonical response (inside transaction). Transaction will commit if no errors.
          return ok({
            round: rr.payload["round"],
            round_number: rr.payload["round_number"],
            leaderboard: rr.payload["leaderboard"],
            eliminated_names: rr.payload["eliminated_names"],
            next_state: rr.payload["next_state"],
            sudden_death_players: rr.payload["sudden_death_players"] || []
          })
        end
      end

      # POST /api/v1/games/:code/host_finish
      def host_finish
        @game.update!(status: :finished, question_end_at: nil)
        ok({ finished: true })
      end

      # GET /api/v1/games/:code/results
      def results
        return render json: { error: { code: "bad_state", message: "Not finished" } }, status: 422 unless @game.finished?

        answers = Question.order(:round_number, :id).map do |q|
          { round: q.round_number, text: q.text, correct_index: q.correct_index }
        end
        players = @game.players.where(is_host: false)
        remaining = players.where(eliminated: false).pluck(:name)
        winner = remaining.first
        ok({ winner: winner, answers: answers })
      end

      private

      def find_game
        @game = Game.find_by!(code: params[:code])
      end

      def require_host!
        token = request.headers["X-Host-Token"].to_s
        render json: { error: { code: "auth", message: "Host token required" } }, status: 403 and return unless token.present? && token == @game.host_token
      end

      def current_question
        if @game.sudden_death?
          sd_round = sudden_death_round_for(@game.round_number)
          sd_scope = Question.where(round_number: sd_round).order(:id)
          sd_count = sd_scope.count
          return nil if sd_count == 0
          base = (@game.respond_to?(:sd_offset) ? @game.sd_offset.to_i : 0) % sd_count
          idx  = (base + (@game.current_question_index || 0)) % sd_count
          sd_scope.offset(idx).first
        else
          Question.where(round_number: @game.round_number).order(:id).offset(@game.current_question_index || 0).first
        end
      end

      def questions_for_round(round)
        Question.where(round_number: round)
      end

      def start_current_question!
        q = current_question
        raise ActiveRecord::RecordNotFound, "Question not found" unless q
        ends_at = q.time_limit.seconds.from_now
        new_status = @game.sudden_death? ? :sudden_death : :in_round
        @game.update!(question_end_at: ends_at, status: new_status)
        broadcast(:question_started, {
          round_number: (@game.sudden_death? ? sudden_death_round_for(@game.round_number) : @game.round_number),
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          ends_at: ends_at.iso8601(3)
        })
      end

      # Sudden-death driver: uses Round 4 questions and eliminates per rules
      def handle_sudden_death_next
        participants = Array(@game.sudden_death_player_ids).map(&:to_i).uniq
        players = participants.map { |pid| @game.players.find_by(id: pid, is_host: false) }.compact

        # If no participants, end SD
        if players.empty?
          @game.update!(status: :between_rounds, question_end_at: nil, sudden_death_player_ids: [], sudden_death_attempts: 0, sudden_death_started_at: nil)
          return ok({ sudden_death_ended: true, reason: "no_participants" })
        end

        # SD question pool based on the round SD was triggered in
        sd_round = sudden_death_round_for(@game.round_number)
        sd_questions = Question.where(round_number: sd_round).order(:id).to_a
        if sd_questions.empty?
          Rails.logger.error("handle_sudden_death_next: no SD questions configured for game=#{@game.id}")
          @game.update!(status: :between_rounds, question_end_at: nil, sudden_death_player_ids: [], sudden_death_attempts: 0, sudden_death_started_at: nil)
          return ok({ sudden_death_ended: true, reason: "no_sd_questions" })
        end

        attempts = @game.sudden_death_attempts || 0

        # Case 1: Question currently open and active
        if @game.question_end_at.present? && Time.current < @game.question_end_at
          return ok({ sudden_death_in_progress: true, attempt: attempts })
        end

        # Case 2: Question just finished or first call
        if attempts < 3
          # Open next question
          @game.update!(current_question_index: attempts) if @game.current_question_index != attempts
          @game.increment!(:sudden_death_attempts)
          start_current_question!

          new_attempts = @game.reload.sudden_death_attempts
          return ok({
            sudden_death_continue: true,
            attempt: new_attempts,
            question_index: @game.current_question_index
          })
        end

        # Case 3: All 3 attempts exhausted - time to eliminate
        # Collect the 3 SD questions actually used (respect sd_offset rotation)
        sd_count = sd_questions.length
        base = (@game.respond_to?(:sd_offset) ? @game.sd_offset.to_i : 0)
        used_indices = 3.times.map { |i| ((base + i) % sd_count) }
        used_q_ids = used_indices.map { |i| sd_questions[i].id }

        if used_q_ids.empty?
          Rails.logger.warn("handle_sudden_death_next: no used SD questions for game=#{@game.id}")
          @game.update!(status: :between_rounds, question_end_at: nil, sudden_death_player_ids: [], sudden_death_attempts: 0, sudden_death_started_at: nil)
          return ok({ sudden_death_ended: true, reason: "no_used_questions" })
        end

        # Aggregate per-player stats across all 3 questions
        stats = participants.each_with_object({}) do |pid, acc|
          acc[pid] = { correct_count: 0, latency_sum: 0 }
        end

        submissions = Submission.where(game: @game, question_id: used_q_ids, player_id: participants)
        submissions.where(correct: true).each do |s|
          stats[s.player_id][:correct_count] += 1
          stats[s.player_id][:latency_sum] += (s.latency_ms || 0)
        end

        Rails.logger.info("SD aggregate stats game=#{@game.id} stats=#{stats.inspect}")

        # Find player(s) with minimum correct answers
        min_correct = stats.values.map { |v| v[:correct_count] }.min
        worst = stats.select { |_pid, v| v[:correct_count] == min_correct }.to_a

        loser_id = nil
        if worst.size == 1
          loser_id = worst.first[0]
        else
          # Tie on correct_count -> pick the one with highest latency (slowest)
          max_latency = worst.map { |_pid, v| v[:latency_sum] }.max
          candidates = worst.select { |_pid, v| v[:latency_sum] == max_latency }.map(&:first)

          if candidates.size == 1
            loser_id = candidates.first
          else
            # Final tie-break: deterministic fallback (lowest player ID)
            loser_id = candidates.sort.first
          end
        end

        if loser_id
          loser = @game.players.find(loser_id)

          # Check if only 1 player will remain after elimination
          remaining_after_elimination = @game.players.where(is_host: false, eliminated: false).where.not(id: loser_id).count
          next_status = remaining_after_elimination <= 1 ? :finished : :between_rounds

          ActiveRecord::Base.transaction do
            loser.update!(eliminated: true)
            @game.update!(
              status: next_status,
              question_end_at: nil,
              sudden_death_player_ids: [],
              sudden_death_attempts: 0,
              sudden_death_started_at: nil
            )
          end

            # Update the existing RoundResult to reflect the SD elimination
            # This ensures round_result endpoint returns fresh data after SD completes
            round_result = RoundResult.find_by(game_id: @game.id, round_number: @game.round_number)
            if round_result
              updated_payload = round_result.payload.deep_dup
              updated_payload["eliminated_names"] = [ loser.name ]
              updated_payload["sudden_death_players"] = []
              updated_payload["next_state"] = next_status.to_s
              round_result.update!(payload: updated_payload)
            end

          broadcast(:sudden_death_eliminated, { name: loser.name })

          # If game is finished, broadcast that too
          if next_status == :finished
            winner = @game.players.where(is_host: false, eliminated: false).first
            broadcast(:game_finished, { winner: winner&.name })
          else
            # Game continues - broadcast updated round result without SD info
            broadcast(:sudden_death_complete, {
              eliminated: loser.name,
              round_number: @game.round_number
            })
          end

          ok({
            sudden_death_ended: true,
            eliminated: loser.name,
            reason: "aggregate",
            next_status: next_status.to_s
          })
        else
          # Fallback: no clear loser
          @game.update!(status: :between_rounds, question_end_at: nil, sudden_death_player_ids: [], sudden_death_attempts: 0, sudden_death_started_at: nil)
          ok({ sudden_death_ended: true, reason: "no_clear_loser" })
        end
      end

      def sudden_death_round_for(base_round)
        case base_round.to_i
        when 1
          4
        when 2
          5
        else
          6
        end
      end

      def broadcast(type, payload)
        # Don't broadcast at all in development if ActionCable not configured
        return unless ActionCable.server.present?

        begin
          channel_name = "game:#{@game.id}"
          message = { type: type.to_s, payload: payload }

          Rails.logger.debug("Broadcasting to #{channel_name}: #{message.inspect}")
          ActionCable.server.broadcast(channel_name, message)
        rescue ArgumentError => e
          Rails.logger.error("Broadcast failed (ArgumentError): #{e.message}")
        rescue => e
          Rails.logger.error("Unexpected broadcast error: #{e.class.name} - #{e.message}")
          Rails.logger.error(e.backtrace.first(5).join("\n"))
        end
      end
    end
  end
end
