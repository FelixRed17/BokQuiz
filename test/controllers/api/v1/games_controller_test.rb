require "test_helper"

class Api::V1::GamesControllerTest < ActionDispatch::IntegrationTest
  test "round answers are available for the active round when the host opens the review page" do
    game = Game.create!
    game.players.create!(name: "Host", is_host: true, ready: true)

    (1..5).each do |index|
      Question.create!(
        game: game,
        round_number: 1,
        text: "Question #{index}",
        options: ["A", "B", "C", "D"],
        correct_index: 1,
        time_limit: 30,
        index: index
      )
    end

    game.update!(status: :in_round, round_number: 1, current_question_index: 0)

    get "/api/v1/games/#{game.code}/round_answers", headers: { "X-Host-Token" => game.host_token }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.dig("data", "round_number")
    assert_equal 5, body.dig("data", "questions").length
    assert_equal "Question 1", body.dig("data", "questions", 0, "text")
    assert_equal 1, body.dig("data", "questions", 0, "correct_index")
  end
end
