class CreateQuestions < ActiveRecord::Migration[7.1]
  def change
    create_table :questions do |t|
      t.integer :round_number, null: false
      t.text    :text,         null: false
      t.jsonb   :options,      null: false, default: []
      t.integer :correct_index, null: false
      t.integer :points,        null: false, default: 1
      t.integer :time_limit,    null: false, default: 40

      t.timestamps
    end

    add_index :questions, :round_number
  end
end
