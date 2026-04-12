//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Copied from src/safari during scripts/safari.sh.
//

import Foundation
import SafariServices
import SQLite3
import os.log

private let safariHistoryPath = NSString(string: "~/Library/Safari/History.db").expandingTildeInPath
private let safariHistoryRequestType = "orange-juice.get-history-visits"
private let safariEpochOffset: Double = 978_307_200
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

private struct NativeStoryLookup {
	let id: String
	let url: String
}

private struct NativeVisit: Codable {
	let id: String
	let visitTime: Double
}

private enum SafariHistoryError: Error, CustomStringConvertible {
	case invalidRequest
	case unsupportedMessageType
	case databaseUnavailable(String)
	case statementPreparationFailed(String)

	var description: String {
		switch self {
		case .invalidRequest:
			return "Invalid Safari native history request."
		case .unsupportedMessageType:
			return "Unsupported Safari native history request type."
		case .databaseUnavailable(let reason):
			return "Safari History.db unavailable: \(reason)"
		case .statementPreparationFailed(let reason):
			return "Failed to prepare Safari history query: \(reason)"
		}
	}
}

private final class SafariHistoryReader {
	private static let sql = """
		SELECT hv.visit_time
		FROM history_visits hv
		INNER JOIN history_items hi ON hi.id = hv.history_item
		WHERE hi.url = ?1 OR hi.url_lowercase = ?2
		ORDER BY hv.visit_time DESC
		LIMIT 1;
		"""

	func getVisits(for stories: [NativeStoryLookup]) throws -> [NativeVisit] {
		var database: OpaquePointer?
		let openResult = sqlite3_open_v2(
			safariHistoryPath,
			&database,
			SQLITE_OPEN_READONLY,
			nil
		)
		guard openResult == SQLITE_OK, let database else {
			let errorMessage = Self.sqliteMessage(from: database)
			sqlite3_close(database)
			throw SafariHistoryError.databaseUnavailable(errorMessage)
		}
		defer {
			sqlite3_close(database)
		}

		var statement: OpaquePointer?
		let prepareResult = sqlite3_prepare_v2(
			database,
			Self.sql,
			-1,
			&statement,
			nil
		)
		guard prepareResult == SQLITE_OK, let statement else {
			throw SafariHistoryError.statementPreparationFailed(Self.sqliteMessage(from: database))
		}
		defer {
			sqlite3_finalize(statement)
		}

		var visits: [NativeVisit] = []
		for story in stories {
			let lowercasedUrl = story.url.lowercased()
			sqlite3_reset(statement)
			sqlite3_clear_bindings(statement)
			sqlite3_bind_text(
				statement,
				1,
				(story.url as NSString).utf8String,
				-1,
				SQLITE_TRANSIENT
			)
			sqlite3_bind_text(
				statement,
				2,
				(lowercasedUrl as NSString).utf8String,
				-1,
				SQLITE_TRANSIENT
			)

			if sqlite3_step(statement) == SQLITE_ROW {
				let safariVisitTime = sqlite3_column_double(statement, 0)
				let unixVisitTime = (safariVisitTime + safariEpochOffset) * 1000
				visits.append(NativeVisit(id: story.id, visitTime: unixVisitTime))
			}
		}

		return visits
	}

	private static func sqliteMessage(from database: OpaquePointer?) -> String {
		guard let database, let cString = sqlite3_errmsg(database) else {
			return "Unknown SQLite error"
		}

		return String(cString: cString)
	}
}

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
	private let historyReader = SafariHistoryReader()

	func beginRequest(with context: NSExtensionContext) {
		let request = context.inputItems.first as? NSExtensionItem

		let profile: UUID?
		if #available(iOS 17.0, macOS 14.0, *) {
			profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
		} else {
			profile = request?.userInfo?["profile"] as? UUID
		}

		let message: Any?
		if #available(iOS 15.0, macOS 11.0, *) {
			message = request?.userInfo?[SFExtensionMessageKey]
		} else {
			message = request?.userInfo?["message"]
		}

		os_log(
			.default,
			"Received message from browser.runtime.sendNativeMessage: %@ (profile: %@)",
			String(describing: message),
			profile?.uuidString ?? "none"
		)

		let responseMessage = handleMessage(message)
		let response = NSExtensionItem()
		if #available(iOS 15.0, macOS 11.0, *) {
			response.userInfo = [SFExtensionMessageKey: responseMessage]
		} else {
			response.userInfo = ["message": responseMessage]
		}

		context.completeRequest(returningItems: [response], completionHandler: nil)
	}

	private func handleMessage(_ rawMessage: Any?) -> [String: Any] {
		do {
			guard let message = rawMessage as? [String: Any] else {
				throw SafariHistoryError.invalidRequest
			}

			guard let type = message["type"] as? String, type == safariHistoryRequestType else {
				throw SafariHistoryError.unsupportedMessageType
			}

			guard let storiesValue = message["stories"] as? [[String: Any]] else {
				throw SafariHistoryError.invalidRequest
			}

			let stories = storiesValue.compactMap(Self.parseStoryLookup)
			let visits = try historyReader.getVisits(for: stories)
			let encodedVisits = try Self.encodeVisits(visits)
			return ["visits": encodedVisits]
		} catch {
			os_log(.error, "Safari history lookup failed: %@", String(describing: error))
			return [
				"error": String(describing: error),
				"visits": []
			]
		}
	}

	private static func parseStoryLookup(_ dictionary: [String: Any]) -> NativeStoryLookup? {
		guard
			let id = dictionary["id"] as? String,
			let url = dictionary["url"] as? String,
			!url.isEmpty
		else {
			return nil
		}

		return NativeStoryLookup(id: id, url: url)
	}

	private static func encodeVisits(_ visits: [NativeVisit]) throws -> [[String: Any]] {
		let data = try JSONEncoder().encode(visits)
		let object = try JSONSerialization.jsonObject(with: data)
		return object as? [[String: Any]] ?? []
	}
}
