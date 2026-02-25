# website
ken macpherson public static website named hosting system
- SSL is typically handled by cloudflare.com front end.

## How to add a new website and host it: 

### 1. Create the website files in the local development environment 

```
mkdir -p ~/personal/website/{newwebsite.com}
touch ~/personal/website/{newwebsite.com}/index.html
cat > ~/personal/website/{newwebsite.com}/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>
EOF
```

### 2. Create the nginx configuration file

```
cp /etc/nginx/sites-available/wealthstrategyguy.com.conf /etc/nginx/sites-available/newwebsite.com.conf
```

### 3. Edit the nginx configuration file

```
nano /etc/nginx/sites-available/newwebsite.com.conf
```
Edit:  line 1: comment with the new website name
Edit:  server_name to {newwebsite.com} and {www.newwebsite.com} 
Edit:  root to {/var/www/newwebsite.com}
Edit:  access_log to {/var/log/nginx/newwebsite.com-access.log}

### 5. Update modified:   .github/workflows/deploywebsite.yml
  - Update the scp-action to include the new website name

```
# newwebsite.com site content by copy the above
    - name: copy newwebsite.com via ssh password
      uses: appleboy/scp-action@v0.1.1
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        port: ${{ secrets.PORT }}
        source: "newwebsite.com/"
        target: "/var/www"
```

### 6. Enable the website on the remote server machine & update the section of the README.md file

```
ln -s /etc/nginx/sites-available/newwebsite.com.conf /etc/nginx/sites-enabled/
```

### 5. Test the nginx configuration

```
nginx -t
```

### 6. Reload nginx

```
systemctl reload nginx
```


## create a new host symbolic link on remote server
- Update this section witht he symbolic link command for the new website
```
ln -s /etc/nginx/sites-available/howlandrotary.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/warren.fyi.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/tcpanthers.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/heavensentdoula.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/kenmacpherson-website.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/unityspecialtypharmacy.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/vibrant-auto.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/customcoatedglass.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/joryanpizzulo.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/warrendeservesbetter.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/jp2m.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/kmac-dogs.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/lenamasonchristian.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/repealtheraises.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/adzispeppers.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/defendwarren.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wealthstrategyguy.com.conf /etc/nginx/sites-enabled/

```

## Verify the new changes of newwebsitename.com on the remote server

# make sure new name is there (git added it and commit and pushed)
ls -ltr /etc/nginx/sites-available/defendwarren.com.conf
ln -s /etc/nginx/sites-available/defendwarren.com.conf /etc/nginx/sites-enabled/

/etc/init.d/nginx restart
### why doesn't his work>>>    systemctl restart nginx
```


## errors: 

```
# tail /var/log/nginx/error.log
2023/08/01 14:54:44 [emerg] 26308#26308: open() "/etc/nginx/sites-enabled/tcpanthers.org.conf" failed (2: No such file or directory) in /etc/nginx/nginx.conf:62

```
2025/05/08 19:36:13 [alert] 10670#10670: *36 open socket #24 left in connection 3
2025/05/08 19:36:13 [alert] 10670#10670: aborting
```
Open files issue. 


```

# update  modified:   .github/workflows/deploywebsite.yml
Make sure you update the 
`.github/workflows/deploywebsite.yml`
```- name: copy website nginx conf file```

```
    - name: copy customcoatedglass.com via ssh password
      uses: appleboy/scp-action@v0.1.1
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        port: ${{ secrets.PORT }}
        source: "customcoatedglass.com/"
        target: "/var/www"      


```


