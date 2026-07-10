require "yaml"

yml_path = Rails.root.join("db", "questions.yml")
unless File.exist?(yml_path)
  abort "Missing db/questions.yml — add the quiz questions file before seeding."
end

Question.delete_all if ENV["RESEED_QUESTIONS"] == "1"

data = YAML.load_file(yml_path, aliases: true)

data.fetch("rounds", []).each do |round|
  round_number = round.fetch("number")

  round.fetch("questions").each_with_index do |question, index|
    attrs = {
      text: question.fetch("text"),
      options: question.fetch("options"),
      correct_index: question.fetch("correct_index"),
      points: question.fetch("points", 1),
      time_limit: question.fetch("time_limit", 25)
    }

    existing = Question.where(round_number: round_number).order(:id).offset(index).first

    if existing
      existing.update!(attrs)
    else
      Question.create!(attrs.merge(round_number: round_number))
    end
  end
end

puts "Seeded #{Question.count} questions from db/questions.yml"
