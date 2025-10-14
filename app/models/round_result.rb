class RoundResult < ApplicationRecord
  belongs_to :game

  validates :round_number, presence: true, uniqueness: { scope: :game_id }
  validates :payload, presence: true
end
