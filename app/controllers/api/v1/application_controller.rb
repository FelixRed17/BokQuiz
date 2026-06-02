module Api
  module V1
    class ApplicationController < ActionController::API
      rescue_from ActiveRecord::RecordNotFound do |e|
        render json: { error: { code: "not_found", message: e.message } }, status: :not_found
      end
      rescue_from ActionController::ParameterMissing do |e|
        render json: { error: { code: "bad_request", message: e.message } }, status: :bad_request
      end

      def ok(payload, status: :ok)
        render json: { data: payload }, status: status
      end
    end
  end
end
