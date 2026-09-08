const { withEntitlementsPlist, withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const APP_GROUP_IDENTIFIER = 'group.com.ayeapps.ayefinance';
const WIDGET_TARGET_NAME = 'AyeFinanceWidgets';
const WIDGET_BUNDLE_ID = 'com.ayeapps.ayefinance.widgets';
const DEPLOYMENT_TARGET = '17.0';
const SWIFT_VERSION = '5.0';

/**
 * Configure Entitlements on the main app
 */
function withAppGroupEntitlements(config) {
  return withEntitlementsPlist(config, (mod) => {
    if (!mod.modResults) {
      mod.modResults = {};
    }
    const currentGroups = mod.modResults['com.apple.security.application-groups'] || [];
    if (!currentGroups.includes(APP_GROUP_IDENTIFIER)) {
      currentGroups.push(APP_GROUP_IDENTIFIER);
    }
    mod.modResults['com.apple.security.application-groups'] = currentGroups;
    return mod;
  });
}

/**
 * Copy widget files from targets/widgets to ios/AyeFinanceWidgets
 * and generate Info.plist and Entitlements.
 */
function copyWidgetFiles(projectRoot, iosDir) {
  const sourceDir = path.join(projectRoot, 'targets', 'widgets');
  const targetDir = path.join(iosDir, WIDGET_TARGET_NAME);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy swift files
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.swift'));
    for (const file of files) {
      const srcFile = path.join(sourceDir, file);
      const destFile = path.join(targetDir, file);
      fs.copyFileSync(srcFile, destFile);
    }
  }

  // Generate Info.plist for Widget Extension
  const infoPlistPath = path.join(targetDir, 'Info.plist');
  const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>AyeFinanceWidgets</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;
  fs.writeFileSync(infoPlistPath, infoPlistContent, 'utf8');

  // Generate Entitlements for Widget Extension
  const entitlementsPath = path.join(targetDir, `${WIDGET_TARGET_NAME}.entitlements`);
  const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_IDENTIFIER}</string>
  </array>
</dict>
</plist>
`;
  fs.writeFileSync(entitlementsPath, entitlementsContent, 'utf8');
}

/**
 * Helper to safely find or create a build phase for a given PBXNativeTarget.
 * Directly manages target.buildPhases array and PBX section dictionary.
 */
function getOrCreateBuildPhaseForTarget(project, targetUuid, phaseType, phaseName) {
  const nativeTargets = project.pbxNativeTargetSection();
  const targetObj = nativeTargets[targetUuid];
  if (!targetObj) return null;

  if (!targetObj.buildPhases) {
    targetObj.buildPhases = [];
  }

  // Look for existing phase in target's buildPhases
  for (const bp of targetObj.buildPhases) {
    if (bp.comment === phaseName) {
      const section = project.hash.project.objects[phaseType];
      if (section && section[bp.value]) {
        return { uuid: bp.value, section: section[bp.value] };
      }
    }
  }

  // Create new build phase
  const phaseUuid = project.generateUuid();
  const buildPhaseObj = {
    isa: phaseType,
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };

  if (!project.hash.project.objects[phaseType]) {
    project.hash.project.objects[phaseType] = {};
  }
  project.hash.project.objects[phaseType][phaseUuid] = buildPhaseObj;
  project.hash.project.objects[phaseType][`${phaseUuid}_comment`] = phaseName;

  targetObj.buildPhases.push({
    value: phaseUuid,
    comment: phaseName,
  });

  return { uuid: phaseUuid, section: buildPhaseObj };
}

/**
 * Configure Xcode Project to add the Widget Extension target
 */
function configureXcodeProject(project, projectRoot) {
  const mainTargetUuid = project.findTargetKey('AyeFinance');
  const existingTargetKey = project.findTargetKey(WIDGET_TARGET_NAME);
  let target;

  if (existingTargetKey) {
    target = { uuid: existingTargetKey };
  } else {
    target = project.addTarget(
      WIDGET_TARGET_NAME,
      'app_extension',
      WIDGET_TARGET_NAME,
      WIDGET_BUNDLE_ID
    );
  }

  if (!target || !target.uuid) {
    return;
  }

  const widgetTargetUuid = target.uuid;
  const nativeTargets = project.pbxNativeTargetSection();
  const widgetNativeTarget = nativeTargets[widgetTargetUuid];
  const mainNativeTarget = nativeTargets[mainTargetUuid];

  // 1. Ensure Widget Target has its own Sources, Frameworks, and Resources phases
  const widgetSources = getOrCreateBuildPhaseForTarget(project, widgetTargetUuid, 'PBXSourcesBuildPhase', 'Sources');
  const widgetFrameworks = getOrCreateBuildPhaseForTarget(project, widgetTargetUuid, 'PBXFrameworksBuildPhase', 'Frameworks');
  getOrCreateBuildPhaseForTarget(project, widgetTargetUuid, 'PBXResourcesBuildPhase', 'Resources');

  // 2. Ensure 'Plugins' group exists to prevent xcode plugin path error
  if (!project.pbxGroupByName('Plugins')) {
    project.addPbxGroup([], 'Plugins', 'Plugins');
  }

  // 3. Setup PBXGroup for AyeFinanceWidgets
  const firstProject = project.getFirstProject().firstProject;
  const mainGroupKey = firstProject.mainGroup;

  let widgetGroupKey = null;
  const groups = project.hash.project.objects.PBXGroup;
  for (const key in groups) {
    if (groups[key] && groups[key].name === WIDGET_TARGET_NAME) {
      widgetGroupKey = key;
      break;
    }
  }

  if (!widgetGroupKey) {
    const newGroup = project.addPbxGroup([], WIDGET_TARGET_NAME, WIDGET_TARGET_NAME);
    widgetGroupKey = newGroup.uuid;
    project.addToPbxGroup(widgetGroupKey, mainGroupKey);
  }

  const swiftFiles = [
    'AccountEntity.swift',
    'AddTransactionIntent.swift',
    'AyeFinanceControl.swift',
    'AyeFinanceWidget.swift',
    'AyeFinanceWidgets.swift',
  ];

  // 4. CRITICAL FIX: Clean main app Sources build phase.
  //    Widget files must NEVER be compiled into the main app (otherwise @main WidgetBundle overrides AppDelegate).
  //    Also make sure AppDelegate.swift is present in the main app Sources!
  const mainSources = getOrCreateBuildPhaseForTarget(project, mainTargetUuid, 'PBXSourcesBuildPhase', 'Sources');
  if (mainSources && mainSources.section && Array.isArray(mainSources.section.files)) {
    mainSources.section.files = mainSources.section.files.filter((f) => {
      const bf = project.hash.project.objects.PBXBuildFile[f.value];
      if (!bf) return false;
      const fr = project.hash.project.objects.PBXFileReference[bf.fileRef];
      const comment = f.comment || (bf && bf.fileRef_comment) || '';
      if (swiftFiles.some((sw) => comment.includes(sw) || (fr && fr.name === sw) || (fr && fr.path && fr.path.includes(sw)))) {
        delete project.hash.project.objects.PBXBuildFile[f.value];
        delete project.hash.project.objects.PBXBuildFile[`${f.value}_comment`];
        return false;
      }
      return true;
    });

    const hasAppDelegate = mainSources.section.files.some((f) => {
      const comment = f.comment || '';
      return comment.includes('AppDelegate.swift');
    });

    if (!hasAppDelegate) {
      let appDelegateRef = null;
      const fileRefs = project.hash.project.objects.PBXFileReference;
      for (const k in fileRefs) {
        if (fileRefs[k] && fileRefs[k].path && fileRefs[k].path.includes('AppDelegate.swift')) {
          appDelegateRef = k;
          break;
        }
      }
      if (appDelegateRef) {
        const buildFileUuid = project.generateUuid();
        project.hash.project.objects.PBXBuildFile[buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: appDelegateRef,
        };
        project.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] = 'AppDelegate.swift in Sources';
        mainSources.section.files.unshift({
          value: buildFileUuid,
          comment: 'AppDelegate.swift in Sources',
        });
      }
    }
  }

  // 5. Clean widgetSources and rebuild with widget Swift files only
  widgetSources.section.files = [];

  const fileRefs = project.hash.project.objects.PBXFileReference;
  for (const k in fileRefs) {
    const item = fileRefs[k];
    if (item && typeof item === 'object') {
      for (const f of swiftFiles) {
        if (item.path && (item.path === f || item.path === `${WIDGET_TARGET_NAME}/${f}` || item.name === f)) {
          delete fileRefs[k];
        }
      }
    }
  }
  if (groups[widgetGroupKey]) {
    groups[widgetGroupKey].children = [];
  }

  for (const fileName of swiftFiles) {
    const file = project.addFile(fileName, widgetGroupKey);
    if (file) {
      if (project.hash.project.objects.PBXFileReference[file.fileRef]) {
        project.hash.project.objects.PBXFileReference[file.fileRef].includeInIndex = 1;
        project.hash.project.objects.PBXFileReference[file.fileRef].name = fileName;
        project.hash.project.objects.PBXFileReference[file.fileRef].path = fileName;
      }
      const buildFileUuid = project.generateUuid();
      project.hash.project.objects.PBXBuildFile[buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: file.fileRef,
      };
      project.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] = `${fileName} in Sources`;
      widgetSources.section.files.push({
        value: buildFileUuid,
        comment: `${fileName} in Sources`,
      });
    }
  }

  // 6. Add Frameworks to Widget Target
  const frameworks = ['WidgetKit.framework', 'SwiftUI.framework', 'AppIntents.framework'];
  for (const fw of frameworks) {
    let fwRef = null;
    for (const k in fileRefs) {
      if (fileRefs[k] && fileRefs[k].name === fw) {
        fwRef = k;
        break;
      }
    }
    if (!fwRef) {
      const addedFw = project.addFramework(fw, { target: widgetTargetUuid });
      if (addedFw) fwRef = addedFw.fileRef;
    }
    if (fwRef && widgetFrameworks && widgetFrameworks.section) {
      const alreadyInFw = widgetFrameworks.section.files.some((f) => {
        const bf = project.hash.project.objects.PBXBuildFile[f.value];
        return bf && bf.fileRef === fwRef;
      });
      if (!alreadyInFw) {
        const buildFileUuid = project.generateUuid();
        project.hash.project.objects.PBXBuildFile[buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: fwRef,
        };
        project.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] = `${fw} in Frameworks`;
        widgetFrameworks.section.files.push({
          value: buildFileUuid,
          comment: `${fw} in Frameworks`,
        });
      }
    }
  }

  // Filter out any default Pods framework linked to the widget target
  if (widgetFrameworks && widgetFrameworks.section && widgetFrameworks.section.files) {
    widgetFrameworks.section.files = widgetFrameworks.section.files.filter((f) => !f.comment || !f.comment.includes('libPods'));
  }

  // 7. Configure Build Settings for Widget Extension Target
  const configurations = project.pbxXCBuildConfigurationSection();
  for (const key in configurations) {
    const config = configurations[key];
    if (
      config.buildSettings &&
      (config.buildSettings.PRODUCT_NAME === `"${WIDGET_TARGET_NAME}"` ||
        config.buildSettings.PRODUCT_NAME === WIDGET_TARGET_NAME)
    ) {
      config.buildSettings.SWIFT_VERSION = `"${SWIFT_VERSION}"`;
      config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = `"${DEPLOYMENT_TARGET}"`;
      config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
      config.buildSettings.INFOPLIST_FILE = `"${WIDGET_TARGET_NAME}/Info.plist"`;
      config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements"`;
      config.buildSettings.CODE_SIGN_STYLE = '"Automatic"';
      config.buildSettings.SKIP_INSTALL = 'YES';
      config.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
      config.buildSettings.CURRENT_PROJECT_VERSION = '"1"';
      config.buildSettings.MARKETING_VERSION = '"1.0.0"';
      config.buildSettings.PRODUCT_BUNDLE_PACKAGE_TYPE = '"XPC!"';
      config.buildSettings.LD_RUNPATH_SEARCH_PATHS =
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';

      // Previews require -Onone (unoptimized build) in Debug configuration
      if (config.name === 'Debug') {
        config.buildSettings.SWIFT_OPTIMIZATION_LEVEL = '"-Onone"';
        config.buildSettings.GCC_OPTIMIZATION_LEVEL = '"0"';
        config.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS = '"DEBUG"';
      } else {
        config.buildSettings.SWIFT_OPTIMIZATION_LEVEL = '"-O"';
        config.buildSettings.GCC_OPTIMIZATION_LEVEL = '"s"';
      }
    }
  }

  // 8. Main App Target Dependencies & Embed App Extension phase
  if (mainTargetUuid) {
    if (!project.hash.project.objects['PBXTargetDependency']) {
      project.hash.project.objects['PBXTargetDependency'] = {};
    }
    if (!project.hash.project.objects['PBXContainerItemProxy']) {
      project.hash.project.objects['PBXContainerItemProxy'] = {};
    }

    const mainDeps = mainNativeTarget.dependencies || [];
    const alreadyDep = mainDeps.some((d) => {
      const depObj = project.hash.project.objects['PBXTargetDependency'][d.value];
      return depObj && depObj.target === widgetTargetUuid;
    });
    if (!alreadyDep) {
      project.addTargetDependency(mainTargetUuid, [widgetTargetUuid]);
    }

    const copyPhases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
    let embedPhase = null;
    let embedPhaseKey = null;
    for (const key in copyPhases) {
      if (key.endsWith('_comment')) continue;
      const phase = copyPhases[key];
      if (
        phase &&
        (phase.name === '"Embed App Extensions"' ||
          phase.name === 'Embed App Extensions' ||
          phase.dstSubfolderSpec === 13 ||
          phase.dstSubfolderSpec === '13')
      ) {
        embedPhase = phase;
        embedPhaseKey = key;
        embedPhase.name = '"Embed App Extensions"';
        break;
      }
    }

    if (!embedPhase) {
      const copyPhase = project.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed App Extensions',
        mainTargetUuid,
        'app_extension'
      );
      if (copyPhase && copyPhase.buildPhase) {
        embedPhase = copyPhase.buildPhase;
        embedPhaseKey = copyPhase.uuid;
      }
    }

    // Ensure the comment in main target buildPhases is 'Embed App Extensions'
    if (mainNativeTarget.buildPhases && embedPhaseKey) {
      for (const bp of mainNativeTarget.buildPhases) {
        if (bp.value === embedPhaseKey) {
          bp.comment = 'Embed App Extensions';
        }
      }
    }

    // Embed the widget extension .appex product
    const productRef = widgetNativeTarget ? widgetNativeTarget.productReference : null;
    if (productRef && embedPhase && Array.isArray(embedPhase.files)) {
      const alreadyEmbedded = embedPhase.files.some((f) => {
        const bf = project.pbxBuildFileSection()[f.value];
        return bf && bf.fileRef === productRef;
      });

      if (!alreadyEmbedded) {
        const buildFileUuid = project.generateUuid();
        project.pbxBuildFileSection()[buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: productRef,
          fileRef_comment: `${WIDGET_TARGET_NAME}.appex`,
          settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
        };
        embedPhase.files.push({
          value: buildFileUuid,
          comment: `${WIDGET_TARGET_NAME}.appex in Embed App Extensions`,
        });
      } else {
        // Ensure RemoveHeadersOnCopy setting exists
        for (const f of embedPhase.files) {
          const bf = project.pbxBuildFileSection()[f.value];
          if (bf && bf.fileRef === productRef) {
            bf.settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
          }
        }
      }
    }
  }

  // 9. Generate Shared Xcode Scheme for AyeFinanceWidgets (enables Canvas Preview & Direct Simulation)
  const schemeDir = path.join(projectRoot, 'ios', 'AyeFinance.xcodeproj', 'xcshareddata', 'xcschemes');
  if (!fs.existsSync(schemeDir)) {
    fs.mkdirSync(schemeDir, { recursive: true });
  }
  const schemePath = path.join(schemeDir, `${WIDGET_TARGET_NAME}.xcscheme`);
  const schemeContent = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1500"
   wasCreatedForAppExtension = "YES"
   version = "2.0">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${widgetTargetUuid}"
               BuildableName = "${WIDGET_TARGET_NAME}.appex"
               BlueprintName = "${WIDGET_TARGET_NAME}"
               ReferencedContainer = "container:AyeFinance.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${mainTargetUuid}"
               BuildableName = "AyeFinance.app"
               BlueprintName = "AyeFinance"
               ReferencedContainer = "container:AyeFinance.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = ""
      selectedLauncherIdentifier = "Xcode.IDEFoundation.Launcher.PosixSpawn"
      launchStyle = "0"
      askForAppToLaunch = "Yes"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES"
      launchAutomaticallySubstyle = "2">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${mainTargetUuid}"
            BuildableName = "AyeFinance.app"
            BlueprintName = "AyeFinance"
            ReferencedContainer = "container:AyeFinance.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
      <MacroExpansion>
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${widgetTargetUuid}"
            BuildableName = "${WIDGET_TARGET_NAME}.appex"
            BlueprintName = "${WIDGET_TARGET_NAME}"
            ReferencedContainer = "container:AyeFinance.xcodeproj">
         </BuildableReference>
      </MacroExpansion>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES"
      launchAutomaticallySubstyle = "2">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${mainTargetUuid}"
            BuildableName = "AyeFinance.app"
            BlueprintName = "AyeFinance"
            ReferencedContainer = "container:AyeFinance.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;
  fs.writeFileSync(schemePath, schemeContent, 'utf8');
}

function ensurePodfileOptimizations(projectRoot) {
  const podfilePath = path.join(projectRoot, 'ios', 'Podfile');
  if (!fs.existsSync(podfilePath)) return;
  let content = fs.readFileSync(podfilePath, 'utf8');
  if (!content.includes('COMPILER_INDEX_STORE_ENABLE')) {
    const targetSnippet = `
    # Disable heavy index store generation for all third-party Pods
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['COMPILER_INDEX_STORE_ENABLE'] = 'NO'
      end
    end`;
    if (content.includes('react_native_post_install')) {
      content = content.replace(
        /react_native_post_install\([\s\S]*?\n\s*\)/,
        (match) => `${match}${targetSnippet}`
      );
      fs.writeFileSync(podfilePath, content, 'utf8');
    }
  }
}

/**
 * Main Expo Config Plugin entrypoint
 */
function withAppleWidgets(config) {
  // 1. Configure entitlements for App Groups
  config = withAppGroupEntitlements(config);

  // 2. Prepare files on disk during expo prebuild
  config = withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');
      copyWidgetFiles(projectRoot, iosDir);
      ensurePodfileOptimizations(projectRoot);
      return modConfig;
    },
  ]);

  // 3. Configure Xcode Project
  config = withXcodeProject(config, async (modConfig) => {
    const projectRoot = modConfig.modRequest.projectRoot;
    configureXcodeProject(modConfig.modResults, projectRoot);
    return modConfig;
  });

  return config;
}

// Allow direct CLI invocation (e.g. `node plugins/withAppleWidgets.js`)
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '..');
  const iosDir = path.join(projectRoot, 'ios');
  const pbxPath = path.join(iosDir, 'AyeFinance.xcodeproj', 'project.pbxproj');

  if (fs.existsSync(pbxPath)) {
    console.log('▶ Preparing Widget files...');
    copyWidgetFiles(projectRoot, iosDir);

    console.log('▶ Configuring Xcode project...');
    const project = xcode.project(pbxPath);
    project.parseSync();
    configureXcodeProject(project, projectRoot);
    fs.writeFileSync(pbxPath, project.writeSync());
    console.log('✅ AyeFinanceWidgets target and AyeFinance main target successfully configured in project.pbxproj!');
  } else {
    console.log('⚠ ios directory not found. Run expo prebuild first.');
  }
}

module.exports = withAppleWidgets;

