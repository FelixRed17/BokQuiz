# class Question < ApplicationRecord
# end

class Question < ApplicationRecord
  belongs_to :game

  validates :text, presence: true
  validates :options, presence: true
  validates :correct_index, presence: true
  validates :points, numericality: { greater_than_or_equal_to: 0 }
end
