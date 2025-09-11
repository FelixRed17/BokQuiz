# class Submission < ApplicationRecord
#   belongs_to :game
#   belongs_to :player
#   belongs_to :question
# end


class Submission < ApplicationRecord
  belongs_to :game
  belongs_to :player
  belongs_to :question

  validates :selected_index, presence: true
end
