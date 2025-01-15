# Learn

## One-Liners

The following one-liners demonstrate different capabilities:

```
# Files opened by thread name
bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf("%s %s\n", comm, str(args->filename)); }'

# Syscall count by thread name
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Read bytes by thread name:
bpftrace -e 'tracepoint:syscalls:sys_exit_read /args->ret/ { @[comm] = sum(args->ret); }'

# Read size distribution by thread name:
bpftrace -e 'tracepoint:syscalls:sys_exit_read { @[comm] = hist(args->ret); }'

# Show per-second syscall rates:
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @ = count(); } interval:s:1 { print(@); clear(@); }'

# Trace disk size by PID and thread name
bpftrace -e 'tracepoint:block:block_rq_issue { printf("%d %s %d\n", pid, comm, args->bytes); }'

# Count page faults by thread name
bpftrace -e 'software:faults:1 { @[comm] = count(); }'

# Count LLC cache misses by thread name and PID (uses PMCs):
bpftrace -e 'hardware:cache-misses:1000000 { @[comm, pid] = count(); }'

# Profile user-level stacks at 99 Hertz for PID 189:
bpftrace -e 'profile:hz:99 /pid == 189/ { @[ustack] = count(); }'

# Files opened in the root cgroup-v2
bpftrace -e 'tracepoint:syscalls:sys_enter_openat /cgroup == cgroupid("/sys/fs/cgroup/unified/mycg")/ { printf("%s\n", str(args->filename)); }'
```

[**One Liner Tutorials**](./tutorial-one-liners)

## Videos

Note: some of the content in these videos may be out of date.

- [Making bpftrace more powerful - 2023](https://www.youtube.com/watch?v=19RZ7b6AZJ0)
- [Bpftrace Recipes: 5 Real Problems Solved - 2023](https://www.youtube.com/watch?v=wMtArNjRYXU)
- [Linux tracing made simpler with bpftrace - 2022](https://www.youtube.com/watch?v=gSxntAO2Iys)
- [Ahead-of-time compiled bpftrace programs - 2021](https://www.youtube.com/watch?v=C2n2i__YCcI)
- [Getting Started with BPF observability - 2021](https://www.youtube.com/watch?v=bGAVrtb_tFs)
- [bpftrace internals - 2020](https://www.youtube.com/watch?v=nDY4iC_ekQY&t=1477s)
- [Using bpftrace with Performance Co-Pilot & Grafana - 2020](https://www.youtube.com/watch?v=ZiGTbItyJyg)
- [An introduction to bpftrace tracing language - 2020](https://www.youtube.com/watch?v=93aHXYqZmU0)

## Glossary

### action
Actions are the programs that run when an event/probe fires (and the predicate is met). An action is a semicolon (;) separated list of statements and always enclosed by brackets {}.

###  address space
Kernel and user pointers live in different address spaces which, depending on the CPU architecture, might overlap. Trying to read a pointer that is in the wrong address space results in a runtime error. This error is hidden by default but can be enabled with the -kk flag.

### BPF/eBPF
Enhanced BPF (eBPF) often used interchangeably with BPF: an amazing technology which enables its users to extend the functionality of operating systems in a fast and secure way. eBPF is powerful, but also very complex, especially for newcomers.[ebpf.io](https://docs.ebpf.io/)

### BPF map
A BPF memory object, which is used by bpftrace to create many higher-level objects.

### BTF
BPF Type Format: the metadata format which encodes the debug info related to BPF program/map.

### builtin
Special variables built into the bpftrace language. Unlike scratch and map variables they don’t need a $ or @ as prefix (except for positional parameters). [List of builtins](https://github.com/bpftrace/bpftrace/blob/master/man/adoc/bpftrace.adoc#builtins)

### dynamic tracing
Also known as dynamic instrumentation, this is a technology that can instrument any software event, such as function calls and returns, by live modification of instruction text. Target software usually does not need special capabilities to support dynamic tracing, other than a symbol table that bpftrace can read. Since this instruments all software text, it is not considered a stable API, and the target functions may not be documented outside of their source code.

### fentry/fexit
These probes attach to kernel functions similar to kprobe and kretprobe. They make use of eBPF trampolines which allow kernel code to call into BPF programs with near zero overhead.

### kprobe/kretprobe
A Linux kernel technology for providing dynamic tracing of kernel functions. A kprobe is fired upon entering of the targeted function and a kretprobe is fired when the function returns.

### map variable
Also known as "globals" use BPF maps. These exist for the lifetime of bpftrace itself and can be accessed from all action blocks and user-space. Map names always start with a @, e.g. `@mymap`.

### per_cpu types
These utilize BPF [per-cpu maps](https://docs.ebpf.io/linux/map-type/) and keep different values stored for each CPU. Some map functions like `count` create per_cpu types.

### positional parameter
Also referred to as command line arguments. They can be accessed inside of a bpftrace program with `$N` where N is the numeric position e.g. `bpftrace -e 'BEGIN { print(($1, $2)); }' 100 200`. Here `$1` is equal to 100 and `$2` is equal to 200. [More information](https://github.com/bpftrace/bpftrace/blob/master/man/adoc/bpftrace.adoc#positional-parameters)

### predicate
The predicate is an optional condition that must be met for the of a probe action to be executed e.g. `kprobe:vfs_read /comm == "bash"/ {`

### probe
An instrumentation point in software or hardware, that generates events that can execute bpftrace programs. [List of probes](https://github.com/bpftrace/bpftrace/blob/master/man/adoc/bpftrace.adoc#probes). You can also list probes on the command line `bpftrace -l`.

### scratch variable
These are kept on the BPF stack and their names always start with a $, e.g. `$myvar`. scratch variables cannot be accessed outside of their lexical block.

### static tracing
Hard-coded instrumentation points in code. Since these are fixed, they may be provided as part of a stable API, and documented.

### tracepoint
A Linux kernel technology for providing static tracing.

### uprobe/uretprobe
A Linux kernel technology for providing dynamic tracing of user-level functions. A uprobe is fired upon entering of the targeted function and a uretprobe is fired when the function returns.

### USDT
User Statically-Defined Tracing: static tracing points for user-level software. Some applications support USDT.
