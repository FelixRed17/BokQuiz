class AddSdOffsetToGames < ActiveRecord::Migration[7.1]
  def change
    add_column :games, :sd_offset, :integer, null: false, default: 0
    add_index :games, :sd_offset
  end
end
