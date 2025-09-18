# Quick setup for sudden death testing
# Run this in Rails console: load 'setup_sudden_death.rb'

# Find the current game
game = Game.last
puts "Setting up sudden death for game: #{game.code}"

# Reset game to between_rounds state
game.update!(
  status: :between_rounds,
  round_number: 1,
  current_question_index: 4,
  question_end_at: nil
)

# Clear existing submissions
game.submissions.delete_all

# Get players (excluding host)
players = game.players.where(is_host: false)
puts "Players: #{players.pluck(:name)}"

# Create dummy submissions where all players have 0 points
# This will trigger sudden death when round_result is called
questions = Question.where(round_number: 1).order(:id)

questions.each do |question|
  players.each do |player|
    # Give wrong answers to ensure 0 points
    wrong_index = question.correct_index == 0 ? 1 : 0
    
    Submission.create!(
      game: game,
      player: player,
      question: question,
      selected_index: wrong_index,
      submitted_at: Time.current,
      latency_ms: rand(1000..3000),
      correct: false
    )
  end
end

puts "✅ Dummy data created!"
puts "Game status: #{game.status}"
puts "Ready to test sudden death - call round_result endpoint now!"
