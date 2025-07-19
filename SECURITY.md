# Security Policy

## Supported Versions

The following versions of SafeEscape backend are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

### Current Security Measures

- **Environment Variable Validation**: All required environment variables are validated on startup
- **Secure CORS Configuration**: Environment-specific CORS settings with restrictive production defaults
- **Rate Limiting**: Comprehensive rate limiting for different endpoint types
- **Input Validation**: All user inputs are sanitized and validated
- **Secure File Uploads**: File type validation, size limits, and content verification
- **Error Handling**: Secure error responses that prevent information disclosure
- **Authentication**: JWT-based authentication with proper token validation
- **Security Headers**: Helmet.js for security headers (CSP, XSS protection, etc.)
- **Dependency Security**: Regular npm audit checks and automatic fixes

### Security Headers

The application automatically sets the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)

### Rate Limiting

Different endpoints have different rate limits:

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Voice API**: 10 requests per 5 minutes
- **File Uploads**: 5 requests per 10 minutes
- **Emergency APIs**: 20 requests per minute

## Reporting a Vulnerability

### How to Report

If you discover a security vulnerability in SafeEscape, please report it responsibly:

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. **DO NOT** post security issues in forums or chat rooms
3. **DO** email security reports to: [security@safeescape.app](mailto:security@safeescape.app)

### What to Include

Please include the following information in your security report:

- **Description**: Clear description of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Impact**: Potential impact and severity assessment
- **Affected Versions**: Which versions are affected
- **Proof of Concept**: If possible, include a proof of concept (but do not exploit the vulnerability)
- **Suggested Fix**: If you have suggestions for fixing the issue

### Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Status Updates**: We will provide regular updates every 10 business days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### Responsible Disclosure

We follow responsible disclosure practices:

1. **Investigation**: We will investigate and validate the reported vulnerability
2. **Fix Development**: We will develop and test a fix
3. **Coordinated Disclosure**: We will coordinate with you on the disclosure timeline
4. **Public Disclosure**: After the fix is deployed, we will publicly disclose the vulnerability

## Security Best Practices

### For Developers

- Always validate and sanitize user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Keep dependencies up to date
- Follow secure coding practices
- Use environment variables for sensitive configuration

### For Deployment

- Use strong, unique passwords and API keys
- Enable HTTPS in production
- Set up proper firewall rules
- Monitor logs for suspicious activity
- Regularly update server software
- Use secure environment variable management

### For Users

- Use strong, unique passwords
- Enable two-factor authentication when available
- Keep your applications updated
- Report suspicious activity immediately

## Security Checklist

Before deploying to production, ensure:

- [ ] All environment variables are properly configured
- [ ] CORS is configured for your specific domains
- [ ] Rate limiting is enabled and configured appropriately
- [ ] HTTPS is enabled with valid certificates
- [ ] Security headers are configured
- [ ] Error messages don't leak sensitive information
- [ ] File uploads are properly validated
- [ ] Authentication is working correctly
- [ ] All dependencies are up to date
- [ ] Security monitoring is in place

## Contact

For security-related questions or concerns:

- **Security Team**: [security@safeescape.app](mailto:security@safeescape.app)
- **General Support**: [support@safeescape.app](mailto:support@safeescape.app)

---

**Note**: This security policy is subject to change. Please check back regularly for updates.
