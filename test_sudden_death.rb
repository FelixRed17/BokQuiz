# Test script to create sudden death scenario
puts "Setting up sudden death test..."

# Find the game
game = Game.last
puts "Game found: #{game.code}"

# Reset game to between_rounds state
game.update!(
  status: :between_rounds,
  round_number: 1,
  current_question_index: 4,
  question_end_at: nil
)

# Clear existing submissions
game.submissions.delete_all

# Get all players (excluding host)
players = game.players.where(is_host: false)
puts "Players: #{players.pluck(:name)}"

# Get questions for round 1
questions = Question.where(round_number: 1).order(:id)
puts "Questions: #{questions.count}"

# Create submissions where all players have the same score (0 points)
# This will trigger sudden death
questions.each do |question|
  players.each do |player|
    # All players get wrong answers (selected_index 1, correct is 1 for first question)
    wrong_index = question.correct_index == 1 ? 0 : 1
    
    Submission.create!(
      game: game,
      player: player,
      question: question,
      selected_index: wrong_index,
      submitted_at: Time.current,
      latency_ms: rand(1000..5000),
      correct: false
    )
  end
end

puts "Created submissions for all players with 0 points each"

# Now trigger round result to activate sudden death
puts "Game ready for sudden death test!"
puts "Game status: #{game.status}"
puts "Round: #{game.round_number}"
puts "Question index: #{game.current_question_index}"

# Check player scores
players.each do |player|
  score = Submission.where(game: game, player: player, correct: true).joins(:question).sum("questions.points")
  puts "#{player.name}: #{score} points"
end
