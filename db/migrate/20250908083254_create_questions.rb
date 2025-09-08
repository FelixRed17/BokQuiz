class CreateQuestions < ActiveRecord::Migration[8.0]
  def change
    create_table :questions do |t|
      t.integer :round_number
      t.text :text
      t.jsonb :options
      t.integer :correct_index
      t.integer :points
      t.integer :time_limit

      t.timestamps
    end
  end
end
