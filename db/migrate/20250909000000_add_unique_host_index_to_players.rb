class AddUniqueHostIndexToPlayers < ActiveRecord::Migration[7.1]
  def change
    add_index :players, :game_id, unique: true, where: "is_host = true", name: "uniq_host_per_game"
  end
end
