#!/usr/bin/env ruby
# Set up Round 2 with a tied scenario

puts "=== 🎯 SETTING UP ROUND 2 TIE SCENARIO ==="

game = Game.last
puts "Current game: #{game.code}"
puts "Current status: #{game.status}"
puts "Current round: #{game.round_number}"

# Reset to Round 2, between_rounds
game.update!(status: :between_rounds, round_number: 2, current_question_index: 4, question_end_at: nil)

# Clear any existing submissions for Round 2
game.submissions.joins(:question).where(questions: { round_number: 2 }).delete_all

# Get active players
active_players = game.players.where(is_host: false, eliminated: false)
puts "Active players: #{active_players.map(&:name).join(', ')}"

# Create tied scenario for Round 2
round2_questions = Question.where(round_number: 2).order(:id)
puts "Round 2 has #{round2_questions.count} questions"

round2_questions.each do |question|
  active_players.each_with_index do |player, index|
    if index < 2  # First 2 players get wrong answers (tie)
      wrong_index = question.correct_index == 0 ? 1 : 0
      Submission.create!(
        game: game, player: player, question: question,
        selected_index: wrong_index, submitted_at: Time.current,
        latency_ms: rand(2000..5000), correct: false
      )
    else  # Last player gets correct answers
      Submission.create!(
        game: game, player: player, question: question,
        selected_index: question.correct_index, submitted_at: Time.current,
        latency_ms: rand(1000..3000), correct: true
      )
    end
  end
end

# Calculate scores
puts "\n📊 Round 2 Scores:"
active_players.each do |player|
  score = Submission.where(game: game, player: player, question: round2_questions)
                   .where(correct: true)
                   .joins(:question)
                   .sum("questions.points")
  puts "   #{player.name}: #{score} points"
end

puts "\n🔥 TIE DETECTED: First 2 players both have 0 points"
puts "   This will trigger SUDDEN DEATH in Round 2!"

puts "\n=== 🧪 READY FOR TESTING ==="
puts "Game Code: #{game.code}"
puts "Status: #{game.status}"
puts "Round: #{game.round_number}"
puts ""
puts "Test Steps:"
puts "1. GET /games/#{game.code}/round_result (should trigger sudden death)"
puts "2. GET /games/#{game.code}/state (should show sudden_death, round 4)"
puts "3. POST /games/#{game.code}/sudden_death_resolve (eliminate one player)"
puts "4. GET /games/#{game.code}/state (should show between_rounds, round 3)"
