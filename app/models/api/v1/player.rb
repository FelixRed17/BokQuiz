# class Player < ApplicationRecord
#   belongs_to :game
# end

class Player < ApplicationRecord
  belongs_to :game
  has_many :submissions, dependent: :destroy

  validates :name, presence: true
end
