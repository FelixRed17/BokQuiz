class GameChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find_by!(code: params[:code])
    stream_from "game:#{@game.id}"
  end
end
