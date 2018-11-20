import js.node.Fs;
import yaml.Yaml;

class Yaml2Js {
    static public function main() {
        // var yamlFile: String = Fs.readFileSync('../bencodex/testsuite/bytestring-dict.yaml', 'utf8');
        var yamlFile = "a:1";
        trace(yamlFile);
        var data = Yaml.parse(yamlFile);
        trace(data);
    }
}
