const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (props) => {
    const existing = props.modResults.filter(
      (p) => !(p.type === 'property' && p.key === 'org.gradle.jvmargs')
    );
    existing.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx3072m -XX:MaxMetaspaceSize=512m',
    });
    props.modResults = existing;
    return props;
  });
};
