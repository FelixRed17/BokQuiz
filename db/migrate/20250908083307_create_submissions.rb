class CreateSubmissions < ActiveRecord::Migration[8.0]
  def change
    create_table :submissions do |t|
      t.references :game, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true
      t.references :question, null: false, foreign_key: true
      t.integer :selected_index
      t.boolean :correct
      t.datetime :submitted_at
      t.integer :latency_ms

      t.timestamps
    end
  end
end
