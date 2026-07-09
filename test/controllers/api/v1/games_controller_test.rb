require "test_helper"

class Api::V1::GamesControllerTest < ActionDispatch::IntegrationTest
  def seed_round_questions(round_number, count: 5)
    count.times do |index|
      Question.create!(
        round_number: round_number,
        text: "Round #{round_number} Question #{index + 1}",
        options: ["A", "B", "C", "D"],
        correct_index: 1,
        time_limit: 30
      )
    end
  end

  test "round answers are available between rounds for the completed round" do
    game = Game.create!
    game.players.create!(name: "Host", is_host: true, ready: true)
    seed_round_questions(1)

    game.update!(
      status: :between_rounds,
      round_number: 1,
      current_question_index: 4,
      last_processed_round: 1,
      question_end_at: nil
    )

    get "/api/v1/games/#{game.code}/round_answers",
        params: { round_number: 1 },
        headers: { "X-Host-Token" => game.host_token }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.dig("data", "round_number")
    assert_equal 5, body.dig("data", "questions").length
    assert_equal "Round 1 Question 1", body.dig("data", "questions", 0, "text")
    assert_equal 1, body.dig("data", "questions", 0, "correct_index")
  end

  test "round answers reject a round that has not finished yet" do
    game = Game.create!
    game.players.create!(name: "Host", is_host: true, ready: true)
    seed_round_questions(1)

    game.update!(
      status: :in_round,
      round_number: 1,
      current_question_index: 2
    )

    get "/api/v1/games/#{game.code}/round_answers",
        params: { round_number: 1 }

    assert_response :unprocessable_entity
  end
end
