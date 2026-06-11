import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../settings/locale_toggle.dart';
import 'auth_controller.dart';

/// Email/password login screen. On success, AuthController transitions to
/// AuthAuthenticated and the router (wired with the app shells) redirects home.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _school = TextEditingController();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _school.dispose();
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(
            identifier: _identifier.text.trim(),
            password: _password.text,
            tenantSlug: _school.text.trim().isEmpty ? null : _school.text.trim(),
          );
    } catch (e) {
      setState(() => _error = 'Sign in failed. Check your credentials.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            const Align(
              alignment: AlignmentDirectional.topEnd,
              child: Padding(padding: EdgeInsets.all(8), child: LocaleToggleButton()),
            ),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Munaxa', style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _school,
                          decoration: const InputDecoration(labelText: 'School (optional)'),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _identifier,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          decoration: const InputDecoration(labelText: 'Email or username'),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Enter your email or username'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _password,
                          obscureText: true,
                          decoration: const InputDecoration(labelText: 'Password'),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Enter your password' : null,
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(_error!,
                              style: TextStyle(color: Theme.of(context).colorScheme.error)),
                        ],
                        const SizedBox(height: 24),
                        FilledButton(
                          onPressed: _loading ? null : _submit,
                          child: Text(_loading ? 'Signing in…' : 'Sign in'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
