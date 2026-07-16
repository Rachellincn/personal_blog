---
title: "势阱、隧穿与力学量算符"
documentTitle: "原子物理 · 应用举例与算符 — NOTEBOOK"
description: "无限深势阱、有限深势阱、谐振子，以及位置与动量算符的本征值图像。"
date: "2026-04-20"
subject: "原子物理"
tags: ["原子物理","算符","量子力学"]
readingTime: 10
language: "zh-CN"
legacyPath: "/posts/atomic-physics-applications-operators.html"
---

<main id="content" class="main">
    <div class="container">

      <div class="note-header">
        <div class="note-meta">
          <span class="tag-cyan">原子物理</span>
          <span class="tag-magenta">量子力学应用</span>
        </div>
        <h1 class="note-title glitch" data-text="应用举例与算符">应用举例与算符</h1>
        <p class="note-date">2026-04-20 · 原子物理第三章 · ~2800 words</p>
      </div>

      <!-- 目录 -->
      <div class="toc-box">
        <div class="toc-title">CONTENTS</div>
        <ul class="toc-list">
          <li><a href="#sec1">1. 一维无限深势阱</a></li>
          <li><a href="#sec2">2. 一维有限深势阱</a></li>
          <li><a href="#sec3">3. 隧道效应例题：一维矩形势垒</a></li>
          <li><a href="#sec4">4. 一维谐振子势阱</a></li>
          <li><a href="#sec5">5. 平均值和算符</a></li>
          <li><a href="#sec6">6. 算符与本征值</a></li>
        </ul>
      </div>

      <!-- 正文 -->
      <div class="note-content">

        <h2 id="sec1" class="section-heading">1. 一维无限深势阱</h2>

        <div class="content-section">
          <p>设现在有一个一维无限深的势阱：</p>
          <p class="formula-center">$$V(x)=\begin{cases}0, & 0<x<L\\[4pt]\infty, & x\le 0 \ \text{或}\ x\ge L\end{cases}$$</p>

          <p>泛定薛定谔方程：</p>
          <p class="formula-center">$$-\frac{\hbar^2}{2m}\frac{d^2\psi(x)}{dx^2}+V(x)\psi(x)=E\psi(x)$$</p>

          <p>在 $0<x<L$ 内，$V(x)=0$，有</p>
          <p class="formula-center">$$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2}=E\psi$$</p>

          <p>也就是</p>
          <p class="formula-center">$$\frac{d^2\psi}{dx^2}+k^2\psi=0, \qquad k^2=\frac{2mE}{\hbar^2}$$</p>

          <p>通解是</p>
          <p class="formula-center">$$\psi(x)=A\sin kx+B\cos kx$$</p>

          <p>边条件是这样的，在势阱外面，由于 $V(x)=\infty$，则 $\psi(x)=0$。又由于波函数连续，所以在 $\psi(0)$ 与 $\psi(L)$ 应该取 $0$，所以有：</p>
          <p class="formula-center">$$kL=n\pi,\qquad n=1,2,3,\dots \quad \text{且} \quad B=0$$</p>

          <p class="formula-center">$$k_n=\frac{n\pi}{L}$$</p>

          <h4 class="step-heading">能量量子化</h4>
          <p class="formula-center">$$\boxed{E_n=\frac{n^2\pi^2\hbar^2}{2mL^2}, \qquad n=1,2,3,\dots}$$</p>

          <p>粒子的能量具有一系列的本征值，能级不连续，具有零点能 $E_1$。</p>

          <h4 class="step-heading">归一化本征函数</h4>
          <p>再根据归一化条件 $\int_0^L |\psi_n(x)|^2dx=1$</p>
          <p>代入有 $A^2\int_0^L \sin^2\frac{n\pi x}{L}\,dx=1$</p>
          <p>根据 $\sin^2+\cos^2=1$，可以得到 $\int_0^L \sin^2\frac{n\pi x}{L}\,dx=\frac{L}{2}$</p>
          <p>从而 $A^2\frac{L}{2}=1 \quad\Rightarrow\quad A=\sqrt{\frac{2}{L}}$</p>

          <p class="formula-center">$$\psi_n(x)=\sqrt{\frac{2}{L}}\sin\frac{n\pi x}{L}, \qquad 0<x<L$$</p>
          <p>势阱外 $\psi_n(x)=0$</p>

          <div class="note-box">
            <p><strong>物理图像：</strong>无限深的势阱的边界像一堵墙，波函数在边界为0，说明粒子不可能出现在边界上，并且，波函数有波幅与波节，这说明<strong>粒子虽然只能待在阱里，但在阱里不同位置被找到的可能性不同。</strong></p>
            <p>但是当 $n$ 趋于无穷大的时候，在有限空间 $L$ 长度内有周期 $T$ 趋于0的无数个正弦波，对应概率密度说明粒子均匀分布，且此时 $\Delta E$ 趋于0，粒子能量连续取值，此时相当于回到了经典状态。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">定态解的物理理解</h4>
            <p>在一维无限深势阱中，定态解表示粒子处于某个确定的能量本征态，其能量只能取一系列离散的能级。对应每一个能级，都有一个确定的波函数形式，它描述的不是粒子的经典轨迹，而是粒子在空间中的概率振幅分布。</p>
            <p>波函数的平方 $|\psi(x)|^2$ 给出粒子在各处被测到的概率密度，因此粒子只可能出现在势阱内部，而且在阱内一般不是均匀分布的：在节点处概率为零，在波腹附近概率较大。定态虽然具有确定能量，但并不具有确定位置；它的概率分布随时间不变，因此可以把它理解为势阱中满足边界条件的稳定驻波。</p>
          </div>
        </div>

        <h2 id="sec2" class="section-heading">2. 一维有限深势阱</h2>

        <div class="content-section">
          <p>现在有这样一个势阱：</p>
          <p class="formula-center">$$V(x)=\begin{cases}0, & |x|<\dfrac d2\\[6pt]V_d, & |x|\ge \dfrac d2\end{cases}$$</p>

          <p>薛定谔方程：$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2}+V(x)\psi=E\psi$</p>

          <h4 class="step-heading">1. 势阱内部</h4>
          <p>仍然解为 $\psi(x)=A\cos kx+B\sin kx$，其中 $k=\frac{\sqrt{2mE}}{\hbar}$</p>

          <h4 class="step-heading">2. 势阱外</h4>
          <p>$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2}+V_d\psi=E\psi$</p>
          <p>也就是 $\frac{d^2\psi}{dx^2}-\kappa^2\psi=0, \qquad \kappa=\frac{\sqrt{2m(V_d-E)}}{\hbar}$</p>
          <p>粒子要想在势阱内，必有 $0<E<V_d$</p>
          <p>于是该方程解为</p>
          <p class="formula-center">$$\psi(x)=\begin{cases}F\,e^{\kappa x}, & x<-\dfrac d2\\[6pt]G\,e^{-\kappa x}, & x>\dfrac d2\end{cases}$$</p>

          <div class="note-box">
            <p><strong>关键结论：</strong>有限深时，波函数在阱外不为零，而是呈指数衰减。</p>
          </div>

          <p>$A,B,F,G$ 用归一化与连续条件求解。</p>

          <h4 class="step-heading">一维有限深势阱的几个特点</h4>

          <div class="note-block">
            <h5 class="step-heading">1. 束缚态的能量是离散的</h5>
            <p>在有限深势阱中，粒子的束缚态不是任意能量都允许，而只能取一系列离散值。这是因为波函数必须同时满足：</p>
            <ul class="styled-list">
              <li>阱内满足定态薛定谔方程；</li>
              <li>阱外必须随 $|x|$ 增大而指数衰减；</li>
              <li>在边界 $x=\pm d/2$ 处，波函数及其导数都要连续。</li>
            </ul>
            <p>这些条件共同限制了允许的能量，因此束缚态能量只能是离散的。</p>
          </div>

          <div class="note-block">
            <h5 class="step-heading">2. 能量本征态一定具有确定宇称</h5>
            <p>由于势阱关于原点对称，即 $V(-x)=V(x)$，所以能量本征态一定可以取成具有确定宇称的形式：</p>
            <ul class="styled-list">
              <li><strong>偶宇称</strong>：$\psi(-x)=\psi(x)$ — 波函数关于原点对称，空间反演后不变；</li>
              <li><strong>奇宇称</strong>：$\psi(-x)=-\psi(x)$ — 波函数关于原点反对称，空间反演后变号。</li>
            </ul>
            <p>物理图像上，偶宇称态通常在中心 $x=0$ 不为零；奇宇称态在中心必有节点，即 $\psi(0)=0$</p>
          </div>

          <div class="note-block">
            <h5 class="step-heading">3. 束缚态存在性的结论</h5>
            <p>可以证明：</p>
            <ul class="styled-list">
              <li>一维有限深势阱中，<strong>至少存在一个偶宇称束缚态</strong>；</li>
              <li>第一个奇宇称束缚态并不一定总存在，只有当势阱足够宽或足够深时才会出现。</li>
            </ul>
            <p>其临界条件为 $d \ge \dfrac{\pi\hbar}{\sqrt{2mV_d}}$。</p>
            <p>也就是说，当 $d$ 小于这个临界值时，势阱中只有偶宇称束缚态；当 $d$ 达到或超过这个临界值时，才会出现第一个奇宇称束缚态。</p>
          </div>
        </div>

        <h2 id="sec3" class="section-heading">3. 隧道效应例题：一维矩形势垒</h2>

        <div class="content-section">
          <p>考虑一维矩形势垒</p>
          <p class="formula-center">$$V(x)=\begin{cases}V_0, & x\in (x_1,x_2)\\0, & \text{其他区域}\end{cases}$$</p>

          <p>把空间分成三个区域：</p>
          <ul class="styled-list">
            <li>区域 I：$x<x_1$</li>
            <li>区域 II：$x_1<x<x_2$</li>
            <li>区域 III：$x>x_2$</li>
          </ul>

          <p>设粒子自左向右入射，且粒子能量满足 $E<V_0$</p>
          <p>这就是经典上"禁阻区"内的运动问题，对应量子力学中的<strong>隧道效应</strong>。</p>

          <p>定态薛定谔方程可写为</p>
          <p class="formula-center">$$\frac{d^2\varphi}{dx^2}=\frac{2m}{\hbar^2}[V(x)-E]\varphi$$</p>

          <p>定义</p>
          <p class="formula-center">$$k_1=\frac{\sqrt{2mE}}{\hbar},\qquad k_2=\frac{\sqrt{2m(V_0-E)}}{\hbar}$$</p>

          <p>则三段区域中的方程分别化为：</p>

          <div class="note-block">
            <h4 class="step-heading">区域 I ($x<x_1$)</h4>
            <p class="formula-center">$$\frac{d^2\varphi_1}{dx^2}=-k_1^2\varphi_1$$</p>
            <p>解为 $\varphi_1(x)=A_1 e^{ik_1x}+B_1 e^{-ik_1x}$</p>
            <ul class="styled-list">
              <li>$A_1 e^{ik_1x}$ 表示从左向右传播的入射波</li>
              <li>$B_1 e^{-ik_1x}$ 表示反射波</li>
            </ul>
          </div>

          <div class="note-block">
            <h4 class="step-heading">区域 II ($x_1<x<x_2$)</h4>
            <p class="formula-center">$$\frac{d^2\varphi_2}{dx^2}=k_2^2\varphi_2$$</p>
            <p>解为 $\varphi_2(x)=A_2 e^{k_2x}+B_2 e^{-k_2x}$</p>
            <p>这里不是振荡解，而是指数型解，说明在经典禁阻区中波函数不会消失，而是呈指数变化。</p>
          </div>

          <div class="note-block">
            <h4 class="step-heading">区域 III ($x>x_2$)</h4>
            <p class="formula-center">$$\frac{d^2\varphi_3}{dx^2}=-k_1^2\varphi_3$$</p>
            <p>由于题设是"粒子从左端入射"，区域 III 中不应有从右向左来的入射波，因此取 $B_3=0$</p>
            <p>所以 $\varphi_3(x)=A_3 e^{ik_1x}$ 表示透射波。</p>
          </div>

          <p>在势能有限跃变处，波函数及其一阶导数都连续，因此在 $x=x_1,x_2$ 处有连接条件。利用这些条件，可以联立求出各系数之间的关系，从而得到反射系数和透射系数。</p>

          <div class="note-box note-important">
            <h4 class="step-heading">隧道效应的物理图像</h4>
            <ul class="styled-list">
              <li>经典力学中，当 $E<V_0$ 时，粒子不能穿过势垒；</li>
              <li>量子力学中，波函数在势垒区内虽然不再振荡，但并不为零，而是指数衰减；</li>
              <li>因此在势垒右侧仍然可能出现非零波函数；</li>
              <li>这意味着粒子有一定概率穿透势垒，出现在右侧。</li>
            </ul>
            <p>这种现象就叫做<strong>隧道效应</strong>。</p>
            <p>设透射系数为 $T$，则：</p>
            <ul class="styled-list">
              <li>势垒越高，$T$ 越小；</li>
              <li>势垒越宽，$T$ 越小；</li>
              <li>粒子能量越接近 $V_0$，$T$ 越大。</li>
            </ul>
            <p>对于较宽势垒，透射概率常近似满足 $T\propto e^{-2k_2a}$，其中 $a=x_2-x_1$ 是势垒宽度。这表明透射概率随势垒宽度增加而呈指数减小。</p>
          </div>

          <h4 class="step-heading">几率流密度</h4>
          <p>量子力学里的几率流密度</p>
          <p class="formula-center">$$\mathbf j = \frac{\hbar}{2mi}\left(\psi^* \nabla \psi-\psi \nabla \psi^*\right)$$</p>
          <p>一维情况下 $j(x,t)=\frac{\hbar}{2mi}\left(\psi^*\frac{\partial \psi}{\partial x}-\psi\frac{\partial \psi^*}{\partial x}\right)$</p>

          <ul class="styled-list">
            <li>$j$ 的方向表示：<strong>概率流动的方向。</strong></li>
            <li>$j$ 的大小表示：<strong>单位时间内穿过单位面积的概率流量。</strong></li>
            <li>如果是一维的 $j(x,t)$，那它表示：<strong>单位时间穿过该点的概率净流量。</strong></li>
          </ul>

          <p>透射系数的定义是 $T=\frac{j_{\text{透}}}{j_{\text{入}}}$</p>
        </div>

        <h2 id="sec4" class="section-heading">4. 一维谐振子势阱</h2>

        <div class="content-section">
          <p>一维谐振子势能</p>
          <p class="formula-center">$$V(x)=\frac12 m\omega^2 x^2$$</p>

          <p>于是定态薛定谔方程是</p>
          <p class="formula-center">$$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2}+\frac12 m\omega^2 x^2\psi=E\psi$$</p>

          <p>引入无量纲变量</p>
          <p class="formula-center">$$y=\alpha x,\qquad \alpha=\sqrt{\frac{m\omega}{\hbar}},\qquad \lambda=\frac{2E}{\hbar\omega}$$</p>

          <p>原方程化为非常漂亮的</p>
          <p class="formula-center">$$\frac{d^2\psi}{dy^2}+(\lambda-y^2)\psi=0$$</p>

          <p>其中 $E=\frac{\lambda}{2}\hbar \omega$</p>

          <p>$y\to\pm\infty$ 时 $\lambda$ 相比 $y^2$ 可以忽略，所以方程近似成</p>
          <p class="formula-center">$$\frac{d^2\psi}{dy^2}-y^2\psi=0, \quad \text{解为} \quad \psi(y)\sim e^{\pm y^2/2}$$</p>

          <p>根据可归一化条件，必有 $\psi(y)\sim e^{-y^2/2}$</p>
          <p>于是可以设解为 $\psi(y)=e^{-y^2/2}g$</p>
          <p>回代有 $\frac{d^2 g}{dy^2}-2y\frac{dg}{dy}+(\lambda-1)=0$</p>

          <p>根据可归一化条件</p>
          <p class="formula-center">$$\lambda=2n+1,\qquad n=0,1,2,\cdots$$</p>

          <h4 class="step-heading">能量本征值</h4>
          <p class="formula-center">$$E_n=\left(n+\frac12\right)\hbar\omega,\qquad n=0,1,2,\cdots$$</p>

          <p>具有<strong>零点能</strong>，量子谐振子不可能像经典振子那样"静止在平衡位置且能量为零"。</p>

          <p class="formula-center">$$\psi_n(y)=A_n e^{-y^2/2}H_n(y)$$</p>
          <p>换回 $x$，有</p>
          <p class="formula-center">$$\psi_n(x)=A_n e^{-\alpha^2x^2/2}H_n(\alpha x),\qquad \alpha=\sqrt{\frac{m\omega}{\hbar}}$$</p>

          <p>其中 $H_n(y)=(-1)^n e^{y^2}\frac{d^n}{dy^n}\left(e^{-y^2}\right)$ 是厄米多项式。</p>

          <div class="note-box">
            <p>$H_n$ 非奇即偶，对应概率分布总是对称的奇偶函数，乘上一个指数衰减因子后变成一个以0为中心两边迅速衰减的函数。同时 $n$ 趋于无穷时候也回归到经典情况，中间高两边低的概率分布。</p>
            <p>能量分立取值，且间隔一致等于 $\hbar\omega$。</p>
            <p>跃迁几率只有在相邻能级才不为0，跃迁只能逐级进行，因此发射光谱只有同一频率。</p>
          </div>
        </div>

        <h2 id="sec5" class="section-heading">5. 平均值和算符</h2>

        <div class="content-section">
          <h3 class="subsection-heading">3.6.1 力学量的平均值</h3>

          <p>若某个量是位置的函数 $f(x)$，那么它的平均值就是</p>
          <p class="formula-center">$$\overline{f(x)}=\int_{-\infty}^{+\infty} f(x)\,\rho(x)\,dx$$</p>

          <div class="note-box note-important">
            <p><strong>在量子力学里，动量一般不是"位置的函数"。</strong>也就是说，量子态里并不存在一种普遍成立的图像：粒子先处在某个确定位置 $x$，然后还对应一个确定的 $p(x)$ 值。那是经典"轨道"语言，而不是量子语言。</p>
          </div>

          <p>故求 $p$ 的平均值需要考虑对概率密度函数做变换代换</p>
          <p class="formula-center">$$\phi(p)=\frac{1}{\sqrt{2\pi\hbar}}\int_{-\infty}^{+\infty}\psi(x)\,e^{-ipx/\hbar}\,dx$$</p>
          <p class="formula-center">$$\psi(x)=\frac{1}{\sqrt{2\pi\hbar}}\int_{-\infty}^{+\infty}\phi(p)\,e^{ipx/\hbar}\,dp$$</p>

          <p>$e^{ipx/\hbar}$ 是确定动量 $p$ 的平面波；而一般波函数 $\psi(x)$ 可以看成很多不同动量平面波的叠加；$\phi(p)$ 就是"动量为 $p$ 的那一部分成分有多强"。</p>

          <p>平均动量为</p>
          <p class="formula-center">$$\overline{p}=\int_{-\infty}^{+\infty} p\,|\phi(p)|^2\,dp$$</p>

          <h3 class="subsection-heading">3.6.2 空间表象下力学量的算符</h3>

          <p>在空间表象里，$f(x)$ 对波函数的作用方式，就是直接乘上去：</p>
          <p class="formula-center">$$\hat f(x)\psi(x)=f(x)\psi(x)$$</p>

          <p>对确定动量 $p$ 的自由粒子，其德布罗意平面波写成</p>
          <p class="formula-center">$$u_p(x)=A e^{ipx/\hbar}$$</p>

          <h3 class="subsection-heading">3.6.3 算符与本征函数与本征值</h3>

          <p><strong>位置算符与动量算符：</strong></p>
          <p class="formula-center">$$\hat x = x,\qquad \hat p_x = -i\hbar \frac{d}{dx}$$</p>

          <p>可以证明对易关系：</p>
          <p class="formula-center">$$[\hat x,\hat p_x]=\hat x\hat p_x-\hat p_x\hat x=i\hbar$$</p>
          <p class="formula-center">$$[\hat x,\hat p_x]=[\hat y,\hat p_y]=[\hat z,\hat p_z]=i\hbar$$</p>
          <p class="formula-center">$$[\hat x,\hat p_y]=[\hat y,\hat p_z]=[\hat z,\hat p_x]=0$$</p>

          <p><strong>角动量算符满足：</strong></p>
          <p class="formula-center">$$[\hat L_x,\hat L_y]=i\hbar \hat L_z,\qquad [\hat L_y,\hat L_z]=i\hbar \hat L_x,\qquad [\hat L_z,\hat L_x]=i\hbar \hat L_y$$</p>

          <p>总角动量平方 $\hat L^2=\hat L_x^2+\hat L_y^2+\hat L_z^2$ 与各分量对易：</p>
          <p class="formula-center">$$[\hat L^2,\hat L_x]=[\hat L^2,\hat L_y]=[\hat L^2,\hat L_z]=0$$</p>

          <div class="note-box">
            <h4 class="step-heading">物理意义：</h4>
            <ul class="styled-list">
              <li>同方向的位置和动量不对易，所以不能同时精确测量，对应不确定关系 $\Delta x\,\Delta p_x \ge \frac{\hbar}{2}$</li>
              <li>不同方向的位置和动量可以对易。</li>
              <li>角动量三个分量彼此不对易，不能同时精确确定。</li>
              <li>但 $\hat L^2$ 和某一个分量（通常取 $\hat L_z$）可以同时确定。</li>
            </ul>
          </div>
        </div>

        <h2 id="sec6" class="section-heading">6. 算符与本征值</h2>

        <div class="content-section">
          <p>算符如果作用在 $f$ 上等于此函数作用在一个标量 $\lambda$ 上，则称此函数 $f$ 为算符 $A$ 的<strong>本征函数</strong>，$\lambda$ 为<strong>本征值</strong>，方程 $\hat A f= \lambda f$ 为<strong>本征方程</strong>。</p>

          <p>不同本征函数的本征值构成一个本征值谱，若将 $n$ 个线性无关的本征函数对应同一个本征值，则称此本征函数是 $n$ 度<strong>简并</strong>的。</p>

          <p><strong>哈密顿算符：</strong></p>
          <p class="formula-center">$$\hat H = -\frac{\hbar^2}{2m}\nabla^2 + V(r)$$</p>

          <p>而薛定谔方程就是这样一个方程：</p>
          <p class="formula-center">$$\hat H\psi = E\psi$$</p>

          <p>这显然是一个<strong>本征方程</strong>。</p>

          <div class="note-block note-important">
            <h4 class="step-heading">重要性质：对易算符的共同本征函数</h4>
            <p>如果两个算符对易，则他们具有相同本征函数：</p>
            <p class="formula-center">$$[\hat A,\hat B]=0 \quad\Longrightarrow\quad \hat A,\hat B \text{ 可以有共同本征函数}$$</p>
            <p>证明：$\hat A(\hat B\psi)=\hat B(\hat A\psi)=\hat B(a\psi)=a(\hat B\psi)$</p>
          </div>

          <h4 class="step-heading">不确定度定义</h4>
          <p>力学量 $\hat A$ 在态 $\psi$ 的不确定度定义为</p>
          <p class="formula-center">$$(\Delta A)^2=\langle \hat A^2\rangle-\langle \hat A\rangle^2$$</p>

          <p>则若 $\hat A\psi=a\psi$，那么 $\langle \hat A\rangle=a, \langle \hat A^2\rangle=a^2$</p>
          <p>从而 $(\Delta A)^2=a^2-a^2=0$。</p>

          <div class="note-box note-important">
            <p><strong>核心结论：</strong>一个态是一个力学量算符的本征函数时，此力学量才有确定的数值（本征值)。<span class="highlight">考试如果考证明有具体数值，则必须要证明它是本征函数，而不是积分为一确定量。</span></p>
          </div>

          <p>在量子世界里，我们能测量到的物理量（如位置、动量、能量等，称为"可观测量"）都是用厄米算符（在有限维空间中就是厄米矩阵）来表示的。所以本征值一定是实数。</p>

          <p>如果态 $\psi$ 不是本征态，那么</p>
          <p class="formula-center">$$\psi=\sum_n c_n \phi_n,\qquad \hat A\phi_n=a_n\phi_n$$</p>

          <p>这时测量 $\hat A$ 时，不会只得到一个固定值，而是可能得到若干个本征值 $a_n$，概率是 $|c_n|^2$。因此这时通常 $\Delta A>0$</p>

          <p>于是说这个力学量在该态中<strong>没有确定值</strong>，只有概率分布。</p>

          <h4 class="step-heading">不确定关系的导出</h4>
          <p>如果两个算符不对易，$[\hat A,\hat B]\neq 0$，比如 $\hat x$、$\hat p$，二者就不能同时都有零不确定度，于是</p>
          <p class="formula-center">$$\Delta A\,\Delta B \ge \frac12 \left| \langle [\hat A,\hat B]\rangle \right|$$</p>

          <p>例如：$[\hat x,\hat p_x]=i\hbar$，则</p>
          <p class="formula-center">$$\Delta x\,\Delta p_x\ge \frac{\hbar}{2}$$</p>
        </div>

      </div>

      <div class="note-footer">
        <a href="../notes.html" class="back-link">← 返回 NOTES</a>
      </div>

    </div>
  </main>
