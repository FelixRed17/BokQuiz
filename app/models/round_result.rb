# app/models/round_result.rb
class RoundResult < ApplicationRecord
  belongs_to :game

  # After a RoundResult row is created and the DB transaction commits,
  # broadcast the canonical payload to ActionCable. We rescue inside the
  # hook to ensure failures here don't bubble up to unrelated flows.
  after_commit :broadcast_result, on: :create

  private

  def broadcast_result
    begin
      payload = self.payload.deep_symbolize_keys rescue {}
      # Normalize / safe defaults
      round_val       = payload[:round] || payload[:round_number] || game&.round_number
      round_number_val = payload[:round_number] || payload[:round] || game&.round_number

      broadcast_payload = {
        round: round_val,
        round_number: round_number_val,
        leaderboard: payload[:leaderboard] || [],
        eliminated_names: payload[:eliminated_names] || [],
        next_state: (payload[:next_state] || game&.status).to_s,
        final: true,
        result_id: id,
        timestamp: Time.current.to_i
      }

      # Use ActionCable directly (do nothing if ActionCable isn't present)
      if defined?(ActionCable) && ActionCable.server.present?
        ActionCable.server.broadcast("game:#{game_id}", { type: 'round_result', payload: broadcast_payload })
        Rails.logger.info("RoundResult#broadcast_result: game=#{game_id} result_id=#{id}")
      else
        Rails.logger.debug("RoundResult#broadcast_result skipped: ActionCable not available")
      end
    rescue => e
      Rails.logger.error("RoundResult#broadcast_result failed: #{e.class.name}: #{e.message}")
      Rails.logger.error(e.backtrace.first(10).join("\n"))
      # Do NOT re-raise
    end
  end
end

