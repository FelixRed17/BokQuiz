class Player < ApplicationRecord
  belongs_to :game

  before_validation :ensure_reconnect_token, on: :create

  validates :name, presence: true, uniqueness: { scope: :game_id }
  validates :reconnect_token, presence: true, uniqueness: true

  scope :active, -> { where(eliminated: false) }

  private

  def ensure_reconnect_token
    self.reconnect_token ||= SecureRandom.hex(16)
  end
end
