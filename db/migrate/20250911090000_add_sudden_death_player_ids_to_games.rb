class AddSuddenDeathPlayerIdsToGames < ActiveRecord::Migration[7.1]
  def change
    add_column :games, :sudden_death_player_ids, :jsonb, null: false, default: []
  end
end
