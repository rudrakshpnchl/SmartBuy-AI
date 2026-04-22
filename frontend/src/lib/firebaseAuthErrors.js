export function getFirebaseAuthErrorMessage(error, action = 'continue') {
  const code = error?.code || ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already in use. Try logging in instead.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Use a stronger password with at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts right now. Wait a bit and try again.'
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase. Check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled in Firebase Authentication.'
    case 'auth/app-not-authorized':
      return 'This domain is not authorized for Firebase Authentication. Add your app domain in Firebase Authentication settings.'
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Your Firebase web API key is invalid. Use the API key from Firebase Project Settings for this web app.'
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured correctly for this app.'
    default:
      return `Failed to ${action}: ${error?.message || 'Unknown Firebase error.'}`
  }
}
