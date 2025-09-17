class Submission < ApplicationRecord
  belongs_to :game
  belongs_to :player
  belongs_to :question

  validates :selected_index, inclusion: { in: [ 0, 1, 2, 3 ] }
  validates :submitted_at, presence: true
  validates :latency_ms, numericality: { greater_than_or_equal_to: 0 }
end
