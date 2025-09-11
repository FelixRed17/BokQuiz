# class Game < ApplicationRecord
# end

class Game < ApplicationRecord
  has_many :players, dependent: :destroy
  has_many :submissions, dependent: :destroy
  has_many :questions, dependent: :destroy

  enum status: { pending: 0, active: 1, finished: 2 }

  validates :code, presence: true, uniqueness: true
  validates :round_number, numericality: { greater_than_or_equal_to: 0 }
end
