class GameChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find_by!(code: params[:code])
    stream_for @game
  end
end
