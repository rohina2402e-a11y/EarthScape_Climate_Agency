# Hadoop HDFS on WSL 2 (Ubuntu)

This guide prepares a single-machine HDFS service for local development. Hadoop runs directly in Ubuntu under WSL 2; it does not use Docker or Kubernetes. A single-machine cluster is for learning and development, not a production or highly available cluster.

## 1. Install WSL 2 and Ubuntu

The current Windows account does not have administrator privileges and WSL is not installed yet. Ask a Windows administrator to do the first step:

1. Open the Start menu, search for **PowerShell**, right-click it, and choose **Run as administrator**.
2. Run:

   ```powershell
   wsl --install --distribution Ubuntu
   ```

3. Restart Windows if prompted.
4. Start **Ubuntu** from the Start menu. At first launch, create a Linux username and password. When entering the Linux password, the terminal does not display the characters; this is normal.

Then open an ordinary PowerShell terminal and verify that Ubuntu uses WSL 2:

```powershell
wsl --list --verbose
```

The Ubuntu row should show version `2`. If it shows `1`, run:

```powershell
wsl --set-version Ubuntu 2
```

If `wsl --install` shows only help text, update WSL using Microsoft's [WSL installation guide](https://learn.microsoft.com/en-us/windows/wsl/install). The installed Windows version is 10 build 19045, which meets Microsoft's stated WSL installation prerequisite, but enabling WSL requires administrator permission.

## 2. Install Java and SSH in Ubuntu

Open the **Ubuntu** terminal (not PowerShell) and run:

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk openssh-server wget
java -version
```

The version output should say `17`. This installs Java inside Ubuntu separately from Windows' Java. Hadoop 3.5 requires Java 17 on the server side.

## 3. Download Apache Hadoop

Download a stable Hadoop binary release from the official Apache distribution site. These commands use Hadoop 3.5.0:

```bash
mkdir -p "$HOME/opt"
cd "$HOME/opt"
wget https://downloads.apache.org/hadoop/common/hadoop-3.5.0/hadoop-3.5.0.tar.gz
wget https://downloads.apache.org/hadoop/common/hadoop-3.5.0/hadoop-3.5.0.tar.gz.sha512
sha512sum -c hadoop-3.5.0.tar.gz.sha512
tar -xzf hadoop-3.5.0.tar.gz
ln -sfn "$HOME/opt/hadoop-3.5.0" "$HOME/opt/hadoop"
```

The checksum command should report `OK`. If the version is no longer available from the Apache download host, choose a current stable binary from the [Apache Hadoop releases page](https://hadoop.apache.org/releases.html) and use that same version in both download URLs and the link command.

## 4. Set Hadoop environment variables

In the Ubuntu terminal, append these settings to your Linux shell configuration:

```bash
cat >> "$HOME/.bashrc" <<'EOF'
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export HADOOP_HOME="$HOME/opt/hadoop"
export HADOOP_CONF_DIR="$HADOOP_HOME/etc/hadoop"
export PATH="$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin"
EOF
source "$HOME/.bashrc"
```

Confirm the commands are found:

```bash
java -version
hadoop version
```

If Ubuntu installed Java in a different location, find it using `readlink -f "$(command -v java)"` and set `JAVA_HOME` to the parent directory of the `bin` folder.

Tell Hadoop which Java to use:

```bash
if grep -q '^export JAVA_HOME=' "$HADOOP_HOME/etc/hadoop/hadoop-env.sh"; then sed -i "s|^export JAVA_HOME=.*|export JAVA_HOME=$JAVA_HOME|" "$HADOOP_HOME/etc/hadoop/hadoop-env.sh"; else echo "export JAVA_HOME=$JAVA_HOME" >> "$HADOOP_HOME/etc/hadoop/hadoop-env.sh"; fi
```

## 5. Configure a one-computer HDFS cluster

In Ubuntu, set up Hadoop's core and HDFS settings:

```bash
cat > "$HADOOP_CONF_DIR/core-site.xml" <<'EOF'
<configuration>
  <property>
    <name>fs.defaultFS</name>
    <value>hdfs://localhost:9000</value>
  </property>
</configuration>
EOF
```

```bash
cat > "$HADOOP_CONF_DIR/hdfs-site.xml" <<'EOF'
<configuration>
  <property>
    <name>dfs.replication</name>
    <value>1</value>
  </property>
  <property>
    <name>dfs.namenode.name.dir</name>
    <value>file://${user.home}/hadoopdata/namenode</value>
  </property>
  <property>
    <name>dfs.datanode.data.dir</name>
    <value>file://${user.home}/hadoopdata/datanode</value>
  </property>
  <property>
    <name>dfs.webhdfs.enabled</name>
    <value>true</value>
  </property>
  <property>
    <name>dfs.datanode.hostname</name>
    <value>localhost</value>
  </property>
</configuration>
EOF
```

For Hadoop's start/stop helper scripts, set up SSH access to the same Ubuntu instance:

```bash
sudo service ssh start
mkdir -p "$HOME/.ssh"
ssh-keygen -t rsa -P '' -f "$HOME/.ssh/id_rsa"
cat "$HOME/.ssh/id_rsa.pub" >> "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"
ssh localhost
```

Accept the first SSH host prompt if shown. Once connected, type `exit` to return to the original Ubuntu terminal.

Format HDFS **once only**, then start the services:

```bash
hdfs namenode -format
start-dfs.sh
hdfs dfs -mkdir -p /earthscape/uploads
hdfs dfs -ls /
```

Do not run `hdfs namenode -format` again after storing data; formatting initializes the filesystem and may make existing HDFS data inaccessible.

The NameNode web page should open at [http://localhost:9870](http://localhost:9870). From Windows PowerShell, check WebHDFS:

```powershell
Invoke-RestMethod "http://localhost:9870/webhdfs/v1/?op=GETHOMEDIRECTORY&user.name=earthscape"
```

If the page or request cannot connect, check that `start-dfs.sh` completed in Ubuntu, then run `jps` in Ubuntu and confirm `NameNode` and `DataNode` are listed.

## 6. Connect the Windows API to HDFS

The backend runs in Windows and calls Hadoop's WebHDFS HTTP API. The Windows application does not access HDFS files directly.

In the VS Code PowerShell terminal, open the local backend environment file:

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency
notepad backend\.env
```

Add or update these values, save, and close Notepad:

```dotenv
HDFS_WEBHDFS_URL=http://localhost:9870
HDFS_USER=earthscape
HDFS_DATANODE_HOSTS=localhost
```

If a WebHDFS `CREATE` redirect points to a different DataNode hostname or IP, add that exact host to `HDFS_DATANODE_HOSTS` as a comma-separated value. Only add the DataNode host reported by your local NameNode. The backend checks that redirect host before sending file data.

Restart the backend from the `backend` folder:

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\backend
npm run dev
```

From another PowerShell terminal, verify:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

The response should contain `hdfs: configured`. Then sign in to the dashboard and upload a valid CSV. The upload history should show its HDFS path. In Ubuntu, verify the stored CSV with:

```bash
hdfs dfs -ls -R /earthscape/uploads
```

The local development setup uses Hadoop's simple WebHDFS user parameter, not enterprise authentication. Keep the NameNode and DataNode ports local and do not expose this setup to untrusted networks. Production clusters require organizational security controls such as Kerberos.

## Stop HDFS

When finished, stop Hadoop from the Ubuntu terminal:

```bash
stop-dfs.sh
```

## References

- [Microsoft: Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Apache Hadoop: Single Node Setup](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-common/SingleCluster.html)
- [Apache Hadoop releases and checksums](https://hadoop.apache.org/releases.html)
