class Game < ApplicationRecord
  has_many :players, dependent: :destroy
  has_many :submissions, dependent: :destroy
  has_many :round_results, dependent: :destroy

  enum :status, { lobby: 0, in_round: 1, between_rounds: 2, sudden_death: 3, finished: 4 }

  before_validation :ensure_code_and_token, on: :create

  validates :code, presence: true, uniqueness: true
  validates :host_token, presence: true, uniqueness: true
  validates :round_number, numericality: { greater_than: 0 }
  validates :current_question_index, numericality: { greater_than_or_equal_to: 0 }

  JOIN_CODE_LENGTH = 6

  private

  def ensure_code_and_token
    self.code ||= loop do
      c = Array.new(JOIN_CODE_LENGTH) { rand(10) }.join
      break c unless Game.exists?(code: c)
    end
    self.host_token ||= SecureRandom.hex(16)
  end
end
