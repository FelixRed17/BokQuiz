require "yaml"

Question.delete_all

yml_path = Rails.root.join("db", "questions.yml")
if File.exist?(yml_path)
  data = YAML.load_file(yml_path)
  data.fetch("rounds", []).each do |round|
    rn = round.fetch("number")
    round.fetch("questions").each do |q|
      Question.create!(
        round_number:  rn,
        text:          q.fetch("text"),
        options:       q.fetch("options"),
        correct_index: q.fetch("correct_index"),
        points:        q.fetch("points", 1),
        time_limit:    q.fetch("time_limit", 25)
      )
    end
  end
else
  puts "No db/questions.yml found. Seeding a small sample…"
  [
    { number: 1, questions: [
      { text: "Sample Q1 R1", options: [ "A", "B", "C", "D" ], correct_index: 0, points: 1, time_limit: 20 },
      { text: "Sample Q2 R1", options: [ "A", "B", "C", "D" ], correct_index: 1, points: 1, time_limit: 20 },
      { text: "Sample Q3 R1", options: [ "A", "B", "C", "D" ], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Sample Q4 R1", options: [ "A", "B", "C", "D" ], correct_index: 3, points: 1, time_limit: 20 },
      { text: "Sample Q5 R1", options: [ "A", "B", "C", "D" ], correct_index: 0, points: 1, time_limit: 20 }
    ] },
    { number: 2, questions: [
      { text: "Sample Q1 R2", options: [ "A", "B", "C", "D" ], correct_index: 1, points: 1, time_limit: 20 },
      { text: "Sample Q2 R2", options: [ "A", "B", "C", "D" ], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Sample Q3 R2", options: [ "A", "B", "C", "D" ], correct_index: 3, points: 1, time_limit: 20 },
      { text: "Sample Q4 R2", options: [ "A", "B", "C", "D" ], correct_index: 0, points: 1, time_limit: 20 },
      { text: "Sample Q5 R2", options: [ "A", "B", "C", "D" ], correct_index: 1, points: 1, time_limit: 20 }
    ] },
    { number: 3, questions: [
      { text: "Sample Q1 R3", options: [ "A", "B", "C", "D" ], correct_index: 2, points: 1, time_limit: 20 },
      { text: "Sample Q2 R3", options: [ "A", "B", "C", "D" ], correct_index: 3, points: 1, time_limit: 20 },
      { text: "Sample Q3 R3", options: [ "A", "B", "C", "D" ], correct_index: 0, points: 1, time_limit: 20 },
      { text: "Sample Q4 R3", options: [ "A", "B", "C", "D" ], correct_index: 1, points: 1, time_limit: 20 },
      { text: "Sample Q5 R3", options: [ "A", "B", "C", "D" ], correct_index: 2, points: 1, time_limit: 20 }
    ] }
  ].each do |round|
    rn = round[:number]
    round[:questions].each do |q|
      Question.create!(
        round_number: rn,
        text: q[:text],
        options: q[:options],
        correct_index: q[:correct_index],
        points: q[:points],
        time_limit: q[:time_limit]
      )
    end
  end
end

puts "Seeded #{Question.count} questions"

# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
