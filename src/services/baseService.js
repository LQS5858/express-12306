export default class baseService {
    success (message, data = null) {
        return {
            success: true,
            message,
            data
        }
    }
    fail (message, error, data = null) {
        return {
            success: false,
            message,
            error,
            data
        }
    }
}