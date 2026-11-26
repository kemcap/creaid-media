<?php
declare(strict_types=1);
// Only this entry point is public. Private application lives beside the document root.
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow, noarchive');
$private=dirname(__DIR__,2).'/creaid-contact-private';
try{
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){header('Allow: POST');http_response_code(405);echo '{"ok":false,"status":"method"}';exit;}
    if(!is_file($private.'/core.php')||!is_file($private.'/config.php')||!is_file($private.'/vendor/autoload.php'))throw new RuntimeException('Not configured');
    require $private.'/core.php';
    require $private.'/vendor/autoload.php';
    $config=require $private.'/config.php';
    $stream=fopen('php://input','rb');
    $body=stream_get_contents($stream,\CreAid\Contact\MAX_BODY+1);
    fclose($stream);
    $send=static function(array $data,array $c):bool{
        $m=new \PHPMailer\PHPMailer\PHPMailer(true);
        $m->isSMTP();$m->Host=$c['smtp_host'];$m->Port=$c['smtp_port'];
        $m->SMTPAuth=true;$m->Username=$c['smtp_username'];$m->Password=$c['smtp_password'];
        $m->SMTPSecure=\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $m->SMTPDebug=0;$m->Timeout=15;$m->CharSet='UTF-8';
        $m->setFrom($c['smtp_username'],'CreAid-Media Kontaktformular');
        $m->addAddress($c['recipient']);$m->addReplyTo($data['email'],$data['name']);
        $m->Subject='Projektanfrage CreAid-Media: '.$data['service'];
        $m->isHTML(false);$m->Body=\CreAid\Contact\messageBody($data);
        return $m->send();
    };
    echo json_encode(\CreAid\Contact\handle($_SERVER,$body,$config,$private.'/rate.json',$send,time()),JSON_THROW_ON_ERROR);
}catch(\CreAid\Contact\Rejection $e){
    http_response_code($e->status);
    if($e->status===429)header('Retry-After: 600');
    echo json_encode(['ok'=>false,'status'=>$e->reason]);
}catch(Throwable){
    http_response_code(503);echo '{"ok":false,"status":"unavailable"}';
}
