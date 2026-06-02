class Question < ApplicationRecord
  validates :round_number, :text, :correct_index, presence: true
  validates :options, length: { is: 4 }
  validates :time_limit, numericality: { greater_than: 0 }
end
