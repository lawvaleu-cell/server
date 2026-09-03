from flask import Flask, jsonify, request

from app.config import config


def _allowed_origins():
    if config.ALLOWED_ORIGIN:
        return [o.strip() for o in config.ALLOWED_ORIGIN.split(",") if o.strip()]
    # No origin configured (local development only): allow localhost.
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ]


def create_app():
    app = Flask(__name__)
    origins = _allowed_origins()

    @app.after_request
    def apply_cors(response):
        origin = request.headers.get("Origin")
        if origin and origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    @app.route("/api/<path:_any>", methods=["OPTIONS"])
    def cors_preflight(_any):
        return ("", 204)

    from app.routes import api
    app.register_blueprint(api)

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"success": False, "message": "Not found"}), 404

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"success": False, "message": "Upload too large"}), 413

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    return app
