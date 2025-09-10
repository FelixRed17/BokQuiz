class AddReadyToPlayers < ActiveRecord::Migration[7.1]
  def change
    add_column :players, :ready, :boolean, null: false, default: false
    add_index :players, [ :game_id, :ready ]
  end
end
