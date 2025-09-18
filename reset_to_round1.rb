#!/usr/bin/env ruby
# Reset current game back to Round 1 with tied scenario

puts "=== 🔄 RESETTING TO ROUND 1 ==="

game = Game.last
puts "Current game: #{game.code}"
puts "Current status: #{game.status}"
puts "Current round: #{game.round_number}"

# Reset to Round 1, between_rounds
game.update!(status: :between_rounds, round_number: 1, current_question_index: 4, question_end_at: nil)

# Clear all submissions
game.submissions.delete_all

# Reset all players to not eliminated
game.players.update_all(eliminated: false)

# Get all players (including host)
all_players = game.players.where(is_host: false)
puts "Active players: #{all_players.map(&:name).join(', ')}"

# Create tied scenario for Round 1
round1_questions = Question.where(round_number: 1).order(:id)
puts "Round 1 has #{round1_questions.count} questions"

round1_questions.each do |question|
  all_players.each_with_index do |player, index|
    if index < 2  # First 2 players get wrong answers (tie)
      wrong_index = question.correct_index == 0 ? 1 : 0
      Submission.create!(
        game: game, player: player, question: question,
        selected_index: wrong_index, submitted_at: Time.current,
        latency_ms: rand(2000..5000), correct: false
      )
    else  # Last 2 players get correct answers
      Submission.create!(
        game: game, player: player, question: question,
        selected_index: question.correct_index, submitted_at: Time.current,
        latency_ms: rand(1000..3000), correct: true
      )
    end
  end
end

# Calculate scores
puts "\n📊 Round 1 Scores:"
all_players.each do |player|
  score = Submission.where(game: game, player: player, question: round1_questions)
                   .where(correct: true)
                   .joins(:question)
                   .sum("questions.points")
  puts "   #{player.name}: #{score} points"
end

puts "\n🔥 TIE DETECTED: First 2 players both have 0 points"
puts "   This will trigger SUDDEN DEATH in Round 1!"

puts "\n=== 🧪 READY FOR TESTING ==="
puts "Game Code: #{game.code}"
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts "Active Players: #{game.players.where(is_host: false, eliminated: false).count}"
puts ""
puts "Test Steps:"
puts "1. GET /games/#{game.code}/round_result (should trigger sudden death)"
puts "2. GET /games/#{game.code}/state (should show sudden_death, round 4)"
puts "3. POST /games/#{game.code}/sudden_death_resolve (eliminate one player)"
puts "4. GET /games/#{game.code}/state (should show between_rounds, round 2)"
