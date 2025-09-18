#!/usr/bin/env ruby
# Test script to verify sudden death flow

puts "Testing Sudden Death Flow..."

# Find the last game
game = Game.last
puts "Game found: #{game.code}"
puts "Current status: #{game.status}"
puts "Current round: #{game.round_number}"
puts "Current question index: #{game.current_question_index}"

# Reset game to between_rounds for round 1
game.update!(status: :between_rounds, round_number: 1, current_question_index: 4, question_end_at: nil)

# Clear submissions
game.submissions.delete_all

# Create dummy submissions for round 1 (all wrong answers = 0 points)
players = game.players.where(is_host: false)
questions = Question.where(round_number: 1).order(:id)

puts "Creating tied scenario for round 1..."
questions.each do |question|
  players.each do |player|
    wrong_index = question.correct_index == 0 ? 1 : 0
    Submission.create!(
      game: game, player: player, question: question,
      selected_index: wrong_index, submitted_at: Time.current,
      latency_ms: rand(1000..3000), correct: false
    )
  end
end

puts "Round 1 submissions created - all players have 0 points"
puts "Ready to test sudden death flow!"
puts ""
puts "Next steps:"
puts "1. Call round_result to trigger sudden death"
puts "2. Check game state (should be sudden_death, round 4, index 0)"
puts "3. Call sudden_death_resolve to eliminate one player"
puts "4. Check game state (should be between_rounds, round 2, index 0)"
