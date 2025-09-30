class CreatePlayers < ActiveRecord::Migration[7.1]
  def change
    create_table :players, id: false do |t|
      t.primary_key :id
      t.references :game, null: false, foreign_key: true

      t.string  :name,         null: false
      t.boolean :is_host,      null: false, default: false
      t.boolean :eliminated,   null: false, default: false
      t.integer :total_score,  null: false, default: 0
      t.string  :reconnect_token, null: false

      t.timestamps
    end

    add_index :players, [ :game_id, :name ], unique: true      # lock names per game
    add_index :players, :reconnect_token,  unique: true      # resume securely
  end
end
