const {
  withAppBuildGradle,
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_RECEIVER_CLASS = 'com.ayeapps.ayefinance.widget.AyeFinanceWidgetReceiver';
const GLANCE_DEPENDENCY = "implementation 'androidx.glance:glance-appwidget:1.1.0'";

/**
 * Copies source files from targets/android-widgets/src/main/ to android/app/src/main/
 */
function copyWidgetFiles(projectRoot) {
  const sourceDir = path.join(projectRoot, 'targets', 'android-widgets', 'src', 'main');
  const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main');

  if (fs.existsSync(sourceDir)) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
  }
}

/**
 * Adds androidx.glance:glance-appwidget dependency to android/app/build.gradle
 * and enables Jetpack Compose build features.
 */
function addGlanceDependency(buildGradle) {
  if (!buildGradle.includes('androidx.glance:glance-appwidget')) {
    const match = buildGradle.match(/dependencies\s*\{/);
    if (match) {
      const insertIndex = match.index + match[0].length;
      buildGradle =
        buildGradle.slice(0, insertIndex) +
        `\n    ${GLANCE_DEPENDENCY}` +
        `\n    implementation 'androidx.glance:glance-material3:1.1.0'` +
        buildGradle.slice(insertIndex);
    }
  }

  // Habilitar Jetpack Compose build feature (sin composeOptions para Kotlin 2.0+)
  if (!buildGradle.includes('buildFeatures {') || !buildGradle.includes('compose true')) {
    const androidMatch = buildGradle.match(/android\s*\{/);
    if (androidMatch) {
      const insertIndex = androidMatch.index + androidMatch[0].length;
      buildGradle =
        buildGradle.slice(0, insertIndex) +
        `\n    buildFeatures {\n        compose true\n    }\n` +
        buildGradle.slice(insertIndex);
    }
  }

  return buildGradle;
}

/**
 * Config plugin to add glance dependency via withAppBuildGradle
 */
function withGlanceAppBuildGradle(config) {
  const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');
  
  // Inject Kotlin 2.0 Compose Compiler plugin into root build.gradle
  config = withProjectBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('org.jetbrains.kotlin:compose-compiler-gradle-plugin')) {
      const depBlock = /dependencies\s*\{/;
      contents = contents.replace(
        depBlock,
        `dependencies {\n        classpath("org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.1.20")`
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy') {
      let contents = mod.modResults.contents;
      
      // Inject apply plugin for Compose Compiler
      if (!contents.includes('org.jetbrains.kotlin.plugin.compose')) {
        const applyBlock = /apply plugin: "com.facebook.react"/;
        contents = contents.replace(
          applyBlock,
          `apply plugin: "com.facebook.react"\napply plugin: "org.jetbrains.kotlin.plugin.compose"`
        );
      }
      
      // Add dependencies and buildFeatures
      mod.modResults.contents = addGlanceDependency(contents);
    }
    return mod;
  });
}

/**
 * Config plugin to add AyeFinanceWidgetReceiver to AndroidManifest.xml
 */
function withGlanceWidgetReceiver(config) {
  return withAndroidManifest(config, (mod) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);

    const receiver = {
      $: {
        'android:name': WIDGET_RECEIVER_CLASS,
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
              },
            },
          ],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/widget_info',
          },
        },
      ],
    };

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const existingIndex = mainApplication.receiver.findIndex(
      (r) => r.$ && r.$['android:name'] === WIDGET_RECEIVER_CLASS
    );

    if (existingIndex >= 0) {
      mainApplication.receiver[existingIndex] = receiver;
    } else {
      mainApplication.receiver.push(receiver);
    }

    return mod;
  });
}

/**
 * Config plugin to copy widget files using withDangerousMod
 */
function withAndroidWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      copyWidgetFiles(projectRoot);
      return modConfig;
    },
  ]);
}

/**
 * Config plugin to register WidgetBridgePackage in MainApplication.kt
 */
function withWidgetBridgePackage(config) {
  const { withMainApplication } = require('@expo/config-plugins');
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    const importRegex = /import com\.facebook\.react\.ReactPackage/;
    const packageName = 'com.ayeapps.ayefinance.widget.WidgetBridgePackage';
    
    if (!contents.includes(packageName)) {
      contents = contents.replace(
        importRegex,
        `import com.facebook.react.ReactPackage\nimport ${packageName}`
      );
    }
    
    if (!contents.includes('WidgetBridgePackage()')) {
      // In Expo SDK 50+, packages are added in PackageList(this).packages.apply { ... }
      // If it doesn't match, we fallback to just trying to insert it after PackageList(this).packages
      const packageListRegex = /PackageList\(this\)\.packages(?:\.apply\s*\{\s*)?/;
      if (packageListRegex.test(contents)) {
        contents = contents.replace(
          /val packages = PackageList\(this\)\.packages/,
          `val packages = PackageList(this).packages\n        packages.add(WidgetBridgePackage())`
        );
      }
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

/**
 * Main Expo Config Plugin for Android Widgets
 */
function withAndroidWidgets(config) {
  config = withGlanceAppBuildGradle(config);
  config = withGlanceWidgetReceiver(config);
  config = withAndroidWidgetFiles(config);
  config = withWidgetBridgePackage(config);
  return config;
}

// Allow direct CLI invocation (e.g. `node plugins/withAndroidWidgets.js`)
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '..');
  const appBuildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

  console.log('▶ Preparing Android Widget files...');
  copyWidgetFiles(projectRoot);

  if (fs.existsSync(appBuildGradlePath)) {
    console.log('▶ Updating android/app/build.gradle...');
    const currentGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
    const updatedGradle = addGlanceDependency(currentGradle);
    fs.writeFileSync(appBuildGradlePath, updatedGradle, 'utf8');
  }

  if (fs.existsSync(manifestPath)) {
    console.log('▶ Updating AndroidManifest.xml...');
    const { XML } = require('@expo/config-plugins');
    const manifestXml = fs.readFileSync(manifestPath, 'utf8');
    XML.parseXMLAsync(manifestXml).then((manifest) => {
      const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
      const receiver = {
        $: {
          'android:name': WIDGET_RECEIVER_CLASS,
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_info',
            },
          },
        ],
      };
      if (!mainApplication.receiver) {
        mainApplication.receiver = [];
      }
      const existingIndex = mainApplication.receiver.findIndex(
        (r) => r.$ && r.$['android:name'] === WIDGET_RECEIVER_CLASS
      );
      if (existingIndex >= 0) {
        mainApplication.receiver[existingIndex] = receiver;
      } else {
        mainApplication.receiver.push(receiver);
      }
      fs.writeFileSync(manifestPath, XML.format(manifest), 'utf8');
      console.log('✅ Android widgets configured successfully!');
    });
  }
}

module.exports = withAndroidWidgets;
