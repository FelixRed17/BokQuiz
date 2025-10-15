class AddSuddenDeathAttemptsToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :sudden_death_attempts, :integer, default: 0, null: false
    add_column :games, :sudden_death_started_at, :datetime
  end
end
