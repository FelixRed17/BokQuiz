class CreatePlayers < ActiveRecord::Migration[8.0]
  def change
    create_table :players do |t|
      t.references :game, null: false, foreign_key: true
      t.string :name
      t.boolean :is_host
      t.boolean :eliminated
      t.integer :total_score
      t.string :reconnect_token

      t.timestamps
    end
  end
end
