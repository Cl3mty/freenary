import 'dart:ui' as ui;

import 'package:flutter/material.dart' show Colors;
import 'package:shadcn_flutter/shadcn_flutter.dart' hide Colors;

class FrostedCard extends StatelessWidget {
  final Widget child;
  final double blurSigma;
  final double overlayAlpha;

  const FrostedCard({
    super.key,
    required this.child,
    this.blurSigma = 22,
    this.overlayAlpha = 0.46,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.colorScheme.background.computeLuminance() < 0.5;
    final radius = BorderRadius.circular(theme.radiusMd);

    final baseAlpha = isDark ? overlayAlpha : (overlayAlpha + 0.24).clamp(0.0, 1.0);
    final topLeftTint = isDark
      ? theme.colorScheme.primary.withValues(alpha: 0.20)
      : theme.colorScheme.primary.withValues(alpha: 0.12);
    final bottomRightTint = isDark
      ? theme.colorScheme.muted.withValues(alpha: 0.16)
      : theme.colorScheme.primary.withValues(alpha: 0.06);
    final borderColor = isDark
      ? theme.colorScheme.border.withValues(alpha: 0.72)
      : theme.colorScheme.border.withValues(alpha: 0.92);
    final shadowAlpha = isDark ? 0.22 : 0.10;

    return ClipRRect(
      borderRadius: radius,
      child: Stack(
        children: [
          Positioned.fill(
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
              child: const SizedBox.expand(),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: radius,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    theme.colorScheme.card.withValues(alpha: baseAlpha + (isDark ? 0.08 : 0.03)),
                    theme.colorScheme.card.withValues(alpha: baseAlpha),
                  ],
                ),
                border: Border.all(color: borderColor),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: shadowAlpha),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: radius,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [topLeftTint, bottomRightTint],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            right: -80,
            top: -80,
            child: IgnorePointer(
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      theme.colorScheme.primary.withValues(alpha: isDark ? 0.28 : 0.22),
                      theme.colorScheme.primary.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: -120,
            bottom: -120,
            child: IgnorePointer(
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      theme.colorScheme.mutedForeground.withValues(alpha: isDark ? 0.18 : 0.10),
                      theme.colorScheme.mutedForeground.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
