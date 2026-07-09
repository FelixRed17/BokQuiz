ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: :number_of_processors)

  setup do
    Question.delete_all
    Submission.delete_all
    RoundResult.delete_all
    Player.delete_all
    Game.delete_all
  end
end
