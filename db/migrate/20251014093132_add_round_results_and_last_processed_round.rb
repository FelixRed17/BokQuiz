class AddRoundResultsAndLastProcessedRound < ActiveRecord::Migration[7.1]
  def change
    create_table :round_results do |t|
      t.references :game, null: false, foreign_key: true, index: true
      t.integer :round_number, null: false
      t.jsonb :payload, null: false, default: {}
      t.timestamps
    end

    add_index :round_results, [:game_id, :round_number], unique: true, name: 'index_round_results_on_game_and_round'

    add_column :games, :last_processed_round, :integer, null: false, default: 0
    add_index :games, :last_processed_round
  end
end
