module Api
  module V1
    class GamesController < ApplicationController
      before_action :find_game, only: [:state, :join]

      # POST /api/v1/games
      def create
        host_name = params.require(:host_name)
        game = Game.create!
        host = game.players.create!(name: host_name, is_host: true)
        ok({ code: game.code, host_token: game.host_token, host_player_id: host.id }, status: :created)
      end

      # GET /api/v1/games/:code/state
      def state
        players = @game.players.order(:created_at).map { |p| { name: p.name, eliminated: p.eliminated } }
        ok({
          status: @game.status,
          round_number: @game.round_number,
          current_question_index: @game.current_question_index,
          players: players
        })
      end

      # POST /api/v1/games/:code/join
      def join
        name = params.require(:name).to_s.strip
        if @game.players.count >= 5
          return render json: { error: { code: "full", message: "Game is full" } }, status: 422
        end
        if @game.players.exists?(name: name)
          return render json: { error: { code: "name_taken", message: "Name already in use" } }, status: 422
        end

        player = @game.players.create!(name: name)
        ok({ player_id: player.id, reconnect_token: player.reconnect_token })
      end

      private

      def find_game
        @game = Game.find_by!(code: params[:code])
      end
    end
  end
end
