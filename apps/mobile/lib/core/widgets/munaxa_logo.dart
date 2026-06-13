import 'package:flutter/material.dart';

/// The Munaxa brand mark (the ibex logo), sized by [height]. Aspect ratio is preserved.
class MunaxaLogo extends StatelessWidget {
  const MunaxaLogo({super.key, this.height = 96});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/munaxa-logo.png',
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.medium,
    );
  }
}
