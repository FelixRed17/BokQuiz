module Api
  module V1
    class GamesController < ApplicationController
      # This finds the game for most actions
      before_action :find_game, except: :create
      before_action :require_host!, only: [ :host_start, :host_next, :host_finish ]

      # POST /api/v1/games
      def create
        host_name = params.require(:host_name)
        game = ::Game.create!
        host = game.players.create!(name: host_name, is_host: true)
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

        ok({
          status: @game.status,
          round_number: @game.round_number,
          current_question_index: @game.current_question_index,
          time_remaining_ms: time_remaining_ms,
          players: players
        })
      end

      # POST /api/v1/games/:code/join
      def join
        name = params.require(:name).to_s.strip
        return render json: { error: { code: "full", message: "Game is full" } }, status: 422 if @game.players.where(is_host: false).count >= 4
        return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422 if @game.players.exists?(name: name)
        return render json: { error: { code: "bad_state", message: "Join only in lobby" } }, status: 422 unless @game.lobby?

        player = @game.players.create!(name: name, is_host: false)
        broadcast(:player_joined, { name: player.name })
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
        unless @game.in_round? || @game.between_rounds?
          return render json: { error: { code: "bad_state", message: "Not in round or between rounds" } }, status: 422
        end

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
        return render json: { error: { code: "bad_state", message: "No open question" } }, status: 422 unless @game.in_round? && @game.question_end_at.present? && Time.current < @game.question_end_at
        q = current_question
        return render json: { error: { code: "not_found", message: "Question not found" } }, status: 404 unless q
        ok({
          round_number: @game.round_number,
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
        qs    = questions_for_round(round)

        players = @game.players.where(is_host: false)
        active  = players.where(eliminated: false)

        # Compute round-only scores (points) and tie-break by total latency_ms
        round_stats = active.map do |p|
          rel = Submission.where(game: @game, player: p, question: qs)
          score = rel.where(correct: true).joins(:question).sum("questions.points")
          latency_sum = rel.where(correct: true).sum(:latency_ms)
          { player: p, name: p.name, round_score: score, latency_sum: latency_sum }
        end

        # Determine lowest by score, tie-break by latency (higher latency worse)
        min_score = round_stats.map { |s| s[:round_score] }.min
        lowest = round_stats.select { |s| s[:round_score] == min_score }
        if lowest.size > 1
          max_latency = lowest.map { |s| s[:latency_sum] }.max
          lowest = lowest.select { |s| s[:latency_sum] == max_latency }
        end

        eliminated_names = []yes 
        next_state = :between_rounds
        ActiveRecord::Base.transaction do
          if lowest.size == 1
            loser = lowest.first[:player]
            loser.update!(eliminated: true)
            eliminated_names = [ loser.name ]
          else
            # still tied after latency tie-break → sudden death
            next_state = :sudden_death
          end

          # If only one active non-host remains, finish game
          remaining = players.where(eliminated: false).count
          next_state = :finished if remaining <= 1

          @game.update!(status: next_state)
        end

        leaderboard = round_stats.sort_by { |s| [ -s[:round_score], s[:latency_sum] ] }
                                  .map { |s| { name: s[:name], round_score: s[:round_score] } }

        broadcast(:round_result, { round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })

        ok({ round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })
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
        Question.where(round_number: @game.round_number).order(:id).offset(@game.current_question_index).first
      end

      def questions_for_round(round)
        Question.where(round_number: round)
      end

      def start_current_question!
        q = current_question
        raise ActiveRecord::RecordNotFound, "Question not found" unless q
        ends_at = q.time_limit.seconds.from_now
        @game.update!(question_end_at: ends_at, status: :in_round)
        broadcast(:question_started, {
          round_number: @game.round_number,
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          ends_at: ends_at.iso8601(3)
        })
      end

      def broadcast(type, payload)
        return unless defined?(GameChannel)
        GameChannel.broadcast_to(@game, { type: type.to_s, payload: payload })
      end
    end
  end
end


# Code 2
module Api
  module V1
    class GamesController < ApplicationController
      # This finds the game for most actions
      before_action :find_game, except: :create
      # -------Shaista's additions below
      before_action :require_host!, only: [ :host_start, :host_next, :host_finish, :sudden_death_resolve ]


      # POST /api/v1/games
      def create
        host_name = params.require(:host_name)
        game = ::Game.create!
        host = game.players.create!(name: host_name, is_host: true)
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

        ok({
          status: @game.status,
          round_number: @game.round_number,
          current_question_index: @game.current_question_index,
          time_remaining_ms: time_remaining_ms,
          players: players
        })
      end

      # POST /api/v1/games/:code/join
      def join
        name = params.require(:name).to_s.strip
        return render json: { error: { code: "full", message: "Game is full" } }, status: 422 if @game.players.where(is_host: false).count >= 4
        return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422 if @game.players.exists?(name: name)
        return render json: { error: { code: "bad_state", message: "Join only in lobby" } }, status: 422 unless @game.lobby?

        player = @game.players.create!(name: name, is_host: false)
        broadcast(:player_joined, { name: player.name })
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
        unless @game.in_round? || @game.between_rounds?
          return render json: { error: { code: "bad_state", message: "Not in round or between rounds" } }, status: 422
        end

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
      # ------- Shaista's additions below ------- 
      def submit
        player_id = params.require(:player_id).to_i
        token     = params.require(:reconnect_token)
        choice    = params.require(:selected_index).to_i
      
        player = @game.players.find(player_id)
        return render json: { error: { code: "auth", message: "Bad token" } }, status: 403 unless player.reconnect_token == token
        return render json: { error: { code: "eliminated", message: "Player eliminated" } }, status: 422 if player.eliminated?
        return render json: { error: { code: "host", message: "Host cannot submit" } }, status: 422 if player.is_host?
        return render json: { error: { code: "closed", message: "Question closed" } }, status: 422 if @game.question_end_at.blank? || Time.current > @game.question_end_at
      
        q = current_question
        opened_at    = @game.question_started_at || (@game.question_end_at - q.time_limit.seconds)
        submitted_at = Time.current
        latency_ms   = [(submitted_at - opened_at) * 1000, 0].max.to_i 
      
        attrs = {
          selected_index: choice,
          submitted_at: submitted_at,
          latency_ms: latency_ms,
          correct: (choice == q.correct_index)
        }
      
        begin
          submission = Submission.create_with(attrs).find_or_create_by!(game: @game, player: player, question: q)
        rescue ActiveRecord::RecordNotUnique
          # concurrent write: someone else wrote the record, just fetch it
          submission = Submission.find_by!(game: @game, player: player, question: q)
        end
      
        broadcast(:player_submitted, { name: player.name, index: @game.current_question_index }) # optional
        ok({ accepted: true })
      end
        
      # ------- Shaista's additions above -------
      
      
      #Shaista's additions below
      #Add new endpoint to resolve sudden death (host-only)
      #Add a new action to the controller (host must call after sudden-death question finishes or when host decides to resolve):
      # POST /api/v1/games/:code/sudden_death_resolve
      def sudden_death_resolve
        return render json: { error: { code: "bad_state", message: "Not in sudden_death" } }, status: 422 unless @game.sudden_death?

        q = current_question
        unless q
          return render json: { error: { code: "not_found", message: "Sudden-death question not found" } }, status: 404
        end

        candidate_ids = @game.sudden_death_candidate_ids
        # pick only submissions from candidate players (treat missing submission as wrong)
        subs = Submission.where(game: @game, question: q, player_id: candidate_ids)

        # check who answered correctly
        correct_subs = subs.where(correct: true)

        if correct_subs.any?
          # fastest correct submission wins
          winner_submission = correct_subs.order(:latency_ms).first
          winner = winner_submission.player

          # eliminate other tied players
          losers = Player.where(game: @game, id: candidate_ids).where.not(id: winner.id)
          eliminated_names = losers.pluck(:name)
          losers.update_all(eliminated: true)

          # clear candidates and move back to between_rounds
         @game.update!(status: :between_rounds, sudden_death_candidate_ids: [])
        

          # broadcast updated round result (but not final game finish)
          broadcast(:sudden_death_result, {
            winner: { id: winner.id, name: winner.name },
            eliminated_names: eliminated_names,
            next_state: :between_rounds
          })

         ok({ winner: winner.name, eliminated: eliminated_names, next_state: :between_rounds })
       else
         # nobody answered correctly — instruct host/UI to repeat sudden death (or choose alternate policy)
        broadcast(:sudden_death_repeat, { message: "No correct answers among tied players. Repeat sudden death." })
        ok({ repeat: true })
      end
  end




      # GET /api/v1/games/:code/question
      def question
        return render json: { error: { code: "bad_state", message: "No open question" } }, status: 422 unless @game.in_round? && @game.question_end_at.present? && Time.current < @game.question_end_at
        q = current_question
        return render json: { error: { code: "not_found", message: "Question not found" } }, status: 404 unless q
        ok({
          round_number: @game.round_number,
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
      # ------- Shaista's additions below -------
      def round_result
        return render json: { error: { code: "bad_state", message: "Not between rounds" } }, status: 422 unless @game.between_rounds?
      
        round = @game.round_number
        qs    = questions_for_round(round)
      
        players = @game.players.where(is_host: false)
        active  = players.where(eliminated: false)
      
        # Compute round-only scores (points) and tie-break by total latency_ms for correct answers
        round_stats = active.map do |p|
          rel = Submission.where(game: @game, player: p, question: qs)
          score = rel.where(correct: true).joins(:question).sum("questions.points")
          latency_sum = rel.where(correct: true).sum(:latency_ms)
          { player: p, name: p.name, round_score: score, latency_sum: latency_sum }
        end
      
        # Determine lowest by score
        min_score = round_stats.map { |s| s[:round_score] }.min
        lowest = round_stats.select { |s| s[:round_score] == min_score }
      
        eliminated_names = []
        next_state = :between_rounds
        sudden_candidates = []
      
        ActiveRecord::Base.transaction do
          if lowest.size > 1
            # tie among lowest — move to sudden_death with tied players as candidates (do not eliminate yet)
            candidate_players = lowest.map { |s| s[:player] }
            sudden_candidates = candidate_players.map(&:id)
            next_state = :sudden_death
      
            # persist candidate ids on game
            @game.update!(status: :sudden_death, sudden_death_candidate_ids: sudden_candidates)
            # broadcast event to UI so it can present sudden-death flow
            broadcast(:sudden_death_start, {
              round: round,
              candidates: candidate_players.map { |p| { id: p.id, name: p.name } }
            })
          else
            # clear sudden death candidates if any leftover
            @game.clear_sudden_death_candidates! if @game.sudden_death_candidate_ids.present?
      
            # single loser -> eliminate
            loser = lowest.first[:player]
            loser.update!(eliminated: true)
            eliminated_names = [ loser.name ]
            next_state = :between_rounds
          end
      
          # If only one active remains and we're at/after final round, finish (keep existing logic)
          remaining = players.where(eliminated: false).count
          next_state = :finished if remaining <= 1 && @game.round_number >= 3
          # NOTE: we don't force-finish if sudden_death is required or if rounds remain.
          @game.update!(status: next_state) unless next_state == :sudden_death
        end
      
        leaderboard = round_stats.sort_by { |s| [ -s[:round_score], s[:latency_sum] ] }
                                  .map { |s| { name: s[:name], round_score: s[:round_score] } }
      
        # Broadcast the usual round result; if sudden_death started, we already broadcast that separately.
        broadcast(:round_result, { round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })
      
        ok({ round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })
      end
      
      # ------- Shaista's additions above -------


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
        Question.where(round_number: @game.round_number).order(:id).offset(@game.current_question_index).first
      end

      def questions_for_round(round)
        Question.where(round_number: round)
      end


      # ------- Shaista's additions below -------
      def start_current_question!
        q = current_question
        raise ActiveRecord::RecordNotFound, "Question not found" unless q
      
        started_at = Time.current
        ends_at    = q.time_limit.seconds.from_now
      
        # if game was already in sudden_death keep its status, else ensure in_round
        new_status = @game.sudden_death? ? :sudden_death : :in_round
      
        @game.update!(
          question_started_at: started_at,
          question_end_at: ends_at,
          status: new_status
        )
      
        broadcast(:question_started, {
          round_number: @game.round_number,
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          started_at: started_at.iso8601(3),
          ends_at: ends_at.iso8601(3),
          sudden_death: @game.sudden_death?
        })
      end
      

      def broadcast(type, payload)
        return unless defined?(GameChannel)
        GameChannel.broadcast_to(@game, { type: type.to_s, payload: payload })
      end
    end
  end
end





#code 3 - One player eliminated per round
module Api
  module V1
    class GamesController < ApplicationController
      before_action :find_game, except: :create
      before_action :require_host!, only: [ :host_start, :host_next, :host_finish, :sudden_death_resolve ]

      # POST /api/v1/games
      def create
        host_name = params.require(:host_name)
        game = ::Game.create!
        host = game.players.create!(name: host_name, is_host: true)
        ok({ code: game.code, host_token: game.host_token, host_player_id: host.id }, status: :created)
      end

      # GET /api/v1/games/:code/state
      def state
        players = @game.players.order(:created_at).map { |p| { name: p.name, eliminated: p.eliminated, is_host: p.is_host, ready: (p.respond_to?(:ready) ? p.ready : false) } }
        time_remaining_ms = if @game.question_end_at
          [ (@game.question_end_at - Time.current) * 1000, 0 ].max.to_i
        else
          0
        end

        ok({
          status: @game.status,
          round_number: @game.round_number,
          current_question_index: @game.current_question_index,
          time_remaining_ms: time_remaining_ms,
          players: players
        })
      end

      # POST /api/v1/games/:code/join
      def join
        name = params.require(:name).to_s.strip
        return render json: { error: { code: "full", message: "Game is full" } }, status: 422 if @game.players.where(is_host: false).count >= 4
        return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422 if @game.players.exists?(name: name)
        return render json: { error: { code: "bad_state", message: "Join only in lobby" } }, status: 422 unless @game.lobby?

        player = @game.players.create!(name: name, is_host: false)
        broadcast(:player_joined, { name: player.name })
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

        non_hosts = @game.players.where(is_host: false)
        all_ready = non_hosts.exists? && non_hosts.where(ready: true).count == non_hosts.count
        broadcast(:all_ready, {}) if all_ready

        ok({ ready: ready_val })
      end

      # POST /api/v1/games/:code/host_start
      def host_start
        return render json: { error: { code: "bad_state", message: "Not in lobby" } }, status: 422 unless @game.lobby?

        unless (1..3).all? { |r| Question.where(round_number: r).count == 5 }
          return render json: { error: { code: "bad_setup", message: "Each round must have exactly 5 questions" } }, status: 422
        end

        @game.update!(status: :in_round, round_number: 1, current_question_index: 0)
        start_current_question!
        ok({ started: true, round_number: @game.round_number, index: @game.current_question_index })
      end

      # POST /api/v1/games/:code/host_next
      def host_next
        unless @game.in_round? || @game.between_rounds?
          return render json: { error: { code: "bad_state", message: "Not in round or between rounds" } }, status: 422
        end

        if @game.in_round?
          if @game.current_question_index >= 4
            @game.update!(status: :between_rounds, question_end_at: nil)
            broadcast(:round_ended, { round_number: @game.round_number })
            ok({ round_ended: true, round_number: @game.round_number })
          else
            @game.increment!(:current_question_index)
            start_current_question!
            ok({ advanced: true, index: @game.current_question_index })
          end
        else
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
        return render json: { error: { code: "bad_state", message: "No open question" } }, status: 422 unless @game.in_round? && @game.question_end_at.present? && Time.current < @game.question_end_at
        q = current_question
        return render json: { error: { code: "not_found", message: "Question not found" } }, status: 404 unless q
        ok({
          round_number: @game.round_number,
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
      def round_result
        return render json: { error: { code: "bad_state", message: "Not between rounds" } }, status: 422 unless @game.between_rounds?

        round = @game.round_number
        qs    = questions_for_round(round)
        players = @game.players.where(is_host: false)
        active  = players.where(eliminated: false)

        round_stats = active.map do |p|
          rel = Submission.where(game: @game, player: p, question: qs)
          score = rel.where(correct: true).joins(:question).sum("questions.points")
          latency_sum = rel.where(correct: true).sum(:latency_ms)
          { player: p, name: p.name, round_score: score, latency_sum: latency_sum }
        end

        min_score = round_stats.map { |s| s[:round_score] }.min
        lowest = round_stats.select { |s| s[:round_score] == min_score }

        eliminated_names = []
        next_state = :between_rounds

        ActiveRecord::Base.transaction do
          if lowest.size == 1
            loser = lowest.first[:player]
            loser.update!(eliminated: true)
            eliminated_names = [ loser.name ]
          else
            # Tie → sudden death
            @game.update!(status: :sudden_death, sudden_death_candidate_ids: lowest.map { |s| s[:player].id })
          end
        end

        leaderboard = round_stats.sort_by { |s| [ -s[:round_score], s[:latency_sum] ] }
                                  .map { |s| { name: s[:name], round_score: s[:round_score] } }

        broadcast(:round_result, { round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })

        ok({ round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })
      end

      # POST /api/v1/games/:code/sudden_death_resolve
      def sudden_death_resolve
        return render json: { error: { code: "bad_state", message: "Not in sudden_death" } }, status: 422 unless @game.sudden_death?

        q = current_question
        return render json: { error: { code: "not_found", message: "Sudden-death question not found" } }, status: 404 unless q

        candidate_ids = @game.sudden_death_candidate_ids
        subs = Submission.where(game: @game, question: q, player_id: candidate_ids)
        correct_subs = subs.where(correct: true)

        if correct_subs.any?
          winner_submission = correct_subs.order(:latency_ms).first
          winner = winner_submission.player

          # Only one eliminated: remove slowest among wrongs or slowest non-winner
          losers = Player.where(game: @game, id: candidate_ids).where.not(id: winner.id)
          loser_submission = subs.where(player_id: losers.pluck(:id)).order(latency_ms: :desc).first
          eliminated_player = loser_submission&.player
          eliminated_names = []
          if eliminated_player
            eliminated_player.update!(eliminated: true)
            eliminated_names = [eliminated_player.name]
          end

          remaining_ids = candidate_ids - (eliminated_player ? [eliminated_player.id] : [])
          @game.update!(status: :between_rounds, sudden_death_candidate_ids: remaining_ids)

          broadcast(:sudden_death_result, {
            winner: { id: winner.id, name: winner.name },
            eliminated_names: eliminated_names,
            next_state: :between_rounds
          })

          ok({ winner: winner.name, eliminated: eliminated_names, next_state: :between_rounds })
        else
          broadcast(:sudden_death_repeat, { message: "No correct answers. Repeat sudden death." })
          ok({ repeat: true })
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
        Question.where(round_number: @game.round_number).order(:id).offset(@game.current_question_index).first
      end

      def questions_for_round(round)
        Question.where(round_number: round)
      end

      def start_current_question!
        q = current_question
        raise ActiveRecord::RecordNotFound, "Question not found" unless q
        ends_at = q.time_limit.seconds.from_now
        @game.update!(question_end_at: ends_at, status: :in_round)
        broadcast(:question_started, {
          round_number: @game.round_number,
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          ends_at: ends_at.iso8601(3)
        })
      end

      def broadcast(type, payload)
        return unless defined?(GameChannel)
        GameChannel.broadcast_to(@game, { type: type.to_s, payload: payload })
      end
    end
  end
end


# code 4 - New live leaderboard broadcast added.
module Api
  module V1
    class GamesController < ApplicationController
      before_action :find_game, except: :create
      before_action :require_host!, only: [ :host_start, :host_next, :host_finish, :sudden_death_resolve ]

      # POST /api/v1/games
      def create
        host_name = params.require(:host_name)
        game = ::Game.create!
        host = game.players.create!(name: host_name, is_host: true)
        ok({ code: game.code, host_token: game.host_token, host_player_id: host.id }, status: :created)
      end

      # GET /api/v1/games/:code/state
      def state
        players = @game.players.order(:created_at).map do |p|
          {
            name: p.name,
            eliminated: p.eliminated,
            is_host: p.is_host,
            ready: (p.respond_to?(:ready) ? p.ready : false)
          }
        end

        time_remaining_ms = if @game.question_end_at
          [ (@game.question_end_at - Time.current) * 1000, 0 ].max.to_i
        else
          0
        end

        ok({
          status: @game.status,
          round_number: @game.round_number,
          current_question_index: @game.current_question_index,
          time_remaining_ms: time_remaining_ms,
          players: players
        })
      end

      # POST /api/v1/games/:code/join
      def join
        name = params.require(:name).to_s.strip
        return render json: { error: { code: "full", message: "Game is full" } }, status: 422 if @game.players.where(is_host: false).count >= 4
        return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422 if @game.players.exists?(name: name)
        return render json: { error: { code: "bad_state", message: "Join only in lobby" } }, status: 422 unless @game.lobby?

        player = @game.players.create!(name: name, is_host: false)
        broadcast(:player_joined, { name: player.name })
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

        non_hosts = @game.players.where(is_host: false)
        all_ready = non_hosts.exists? && non_hosts.where(ready: true).count == non_hosts.count
        broadcast(:all_ready, {}) if all_ready

        ok({ ready: ready_val })
      end

      # POST /api/v1/games/:code/host_start
      def host_start
        return render json: { error: { code: "bad_state", message: "Not in lobby" } }, status: 422 unless @game.lobby?

        unless (1..3).all? { |r| Question.where(round_number: r).count == 5 }
          return render json: { error: { code: "bad_setup", message: "Each round must have exactly 5 questions" } }, status: 422
        end

        @game.update!(status: :in_round, round_number: 1, current_question_index: 0)
        start_current_question!
        ok({ started: true, round_number: @game.round_number, index: @game.current_question_index })
      end

      # POST /api/v1/games/:code/host_next
      def host_next
        unless @game.in_round? || @game.between_rounds?
          return render json: { error: "bad_state", message: "Not in round or between rounds" }, status: 422
        end

        if @game.in_round?
          if @game.current_question_index >= 4
            @game.update!(status: :between_rounds, question_end_at: nil)
            broadcast(:round_ended, { round_number: @game.round_number })
            ok({ round_ended: true, round_number: @game.round_number })
          else
            @game.increment!(:current_question_index)
            start_current_question!
            ok({ advanced: true, index: @game.current_question_index })
          end
        else
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
        return render json: { error: "auth", message: "Bad token" }, status: 403 unless player.reconnect_token == token
        return render json: { error: "eliminated", message: "Player eliminated" }, status: 422 if player.eliminated?
        return render json: { error: "host", message: "Host cannot submit" }, status: 422 if player.is_host?
        return render json: { error: "closed", message: "Question closed" }, status: 422 if @game.question_end_at.blank? || Time.current > @game.question_end_at

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
        return render json: { error: "bad_state", message: "No open question" }, status: 422 unless @game.in_round? && @game.question_end_at.present? && Time.current < @game.question_end_at
        q = current_question
        return render json: { error: "not_found", message: "Question not found" }, status: 404 unless q

        ok({
          round_number: @game.round_number,
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          ends_at: @game.question_end_at.iso8601(3)
        })
      end

      # GET /api/v1/games/:code/round_result
      def round_result
        return render json: { error: "bad_state", message: "Not between rounds" }, status: 422 unless @game.between_rounds?

        round = @game.round_number
        qs    = questions_for_round(round)
        players = @game.players.where(is_host: false)
        active  = players.where(eliminated: false)

        round_stats = active.map do |p|
          rel = Submission.where(game: @game, player: p, question: qs)
          score = rel.where(correct: true).joins(:question).sum("questions.points")
          latency_sum = rel.where(correct: true).sum(:latency_ms)
          { player: p, name: p.name, round_score: score, latency_sum: latency_sum }
        end

        min_score = round_stats.map { |s| s[:round_score] }.min
        lowest = round_stats.select { |s| s[:round_score] == min_score }
        if lowest.size > 1
          max_latency = lowest.map { |s| s[:latency_sum] }.max
          lowest = lowest.select { |s| s[:latency_sum] == max_latency }
        end

        eliminated_names = []
        next_state = :between_rounds
        ActiveRecord::Base.transaction do
          if lowest.size == 1
            loser = lowest.first[:player]
            loser.update!(eliminated: true)
            eliminated_names = [ loser.name ]
          else
            @game.update!(sudden_death_candidate_ids: lowest.map { |s| s[:player].id })
            next_state = :sudden_death
          end

          remaining = players.where(eliminated: false).count
          next_state = :finished if remaining <= 1

          @game.update!(status: next_state)
        end

        leaderboard = round_stats.sort_by { |s| [ -s[:round_score], s[:latency_sum] ] }
                                 .map { |s| { name: s[:name], round_score: s[:round_score], eliminated: s[:player].eliminated } }

        broadcast(:round_result, { round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })
        ok({ round: round, leaderboard: leaderboard, eliminated_names: eliminated_names, next_state: next_state })
      end

      # POST /api/v1/games/:code/sudden_death_resolve
      def sudden_death_resolve
        return render json: { error: "bad_state", message: "Not in sudden_death" }, status: 422 unless @game.sudden_death?

        q = current_question
        return render json: { error: "not_found", message: "Sudden-death question not found" }, status: 404 unless q

        candidate_ids = @game.sudden_death_candidate_ids
        subs = Submission.where(game: @game, question: q, player_id: candidate_ids)
        correct_subs = subs.where(correct: true)

        if correct_subs.any?
          winner_submission = correct_subs.order(:latency_ms).first
          winner = winner_submission.player

          losers = Player.where(game: @game, id: candidate_ids).where.not(id: winner.id)
          eliminated_player = if losers.count > 1
            slowest_sub = subs.where(player: losers).order(latency_ms: :desc).first
            slowest_sub.player
          else
            losers.first
          end
          eliminated_player.update!(eliminated: true)
          eliminated_names = [eliminated_player.name]

          @game.update!(status: :between_rounds, sudden_death_candidate_ids: [])

          players = @game.players.where(is_host: false)
          leaderboard = players.map do |p|
            round_score = Submission.where(game: @game, player: p).joins(:question).where(correct: true).sum("questions.points")
            { name: p.name, round_score: round_score, eliminated: p.eliminated }
          end.sort_by { |s| -s[:round_score] }

          broadcast(:sudden_death_result, {
            winner: { id: winner.id, name: winner.name },
            eliminated_names: eliminated_names,
            next_state: :between_rounds,
            leaderboard: leaderboard
          })

          ok({ winner: winner.name, eliminated: eliminated_names, next_state: :between_rounds, leaderboard: leaderboard })
        else
          broadcast(:sudden_death_repeat, { message: "No correct answers among tied players. Repeat sudden death." })
          ok({ repeat: true })
        end
      end

      # POST /api/v1/games/:code/host_finish
      def host_finish
        @game.update!(status: :finished, question_end_at: nil)
        ok({ finished: true })
      end

      # GET /api/v1/games/:code/results
      def results
        return render json: { error: "bad_state", message: "Not finished" }, status: 422 unless @game.finished?

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
        render json: { error: "auth", message: "Host token required" }, status: 403 and return unless token.present? && token == @game.host_token
      end

      def current_question
        Question.where(round_number: @game.round_number).order(:id).offset(@game.current_question_index).first
      end

      def questions_for_round(round)
        Question.where(round_number: round)
      end

      def start_current_question!
        q = current_question
        raise ActiveRecord::RecordNotFound, "Question not found" unless q
        ends_at = q.time_limit.seconds.from_now
        @game.update!(question_end_at: ends_at, status: :in_round)
        broadcast(:question_started, {
          round_number: @game.round_number,
          index: @game.current_question_index,
          text: q.text,
          options: q.options,
          ends_at: ends_at.iso8601(3)
        })
      end

      def broadcast(type, payload)
        return unless defined?(GameChannel)
        GameChannel.broadcast_to(@game, { type: type.to_s, payload: payload })
      end
    end
  end
end
