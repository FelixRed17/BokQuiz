class RemoveSuddenDeathAttemptsFromGames < ActiveRecord::Migration[8.0]
  def change
    remove_column :games, :sudden_death_attempts, :integer
  end
end
