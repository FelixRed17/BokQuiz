class ApplicationController < ActionController::API
	private

	# Uniform API error renderer. Keeps the existing nested `error` shape but
	# also exposes a top-level `error_message` string to be defensive for
	# clients that coerce objects to strings (which results in "[object Object]").
	def render_api_error(code:, message:, status: :unprocessable_entity)
		payload = { error: { code: code, message: message }, error_message: message }
		render json: payload, status: status
	end
end
